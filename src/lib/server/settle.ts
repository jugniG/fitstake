import { and, asc, eq, isNull } from 'drizzle-orm'
import { db, challenge, day } from '#/db.server'
import { decideSettlement } from '#/lib/challenge'
import type { DayStatus, DayWindow } from '#/lib/challenge'
import {
  createSettlementRefund,
  findSettlementRefund,
  retrieveRefundStatus,
} from '#/lib/kelviq/refund'

export type SettlementSweepResult = {
  settled: number
  refunded: number
  errors: string[]
}

const STALE_SETTLEMENT_MS = 60 * 60 * 1000

// Settles a single challenge if all days are concluded or resolved.
// Used for immediate final-day settlement and lazy dashboard settlement without a cron.
export async function settleChallenge(
  challengeId: string,
  now = new Date(),
): Promise<'settled' | 'refunded' | 'wait' | 'already_settling' | 'error'> {
  const challengeRow = await db.query.challenge.findFirst({
    where: and(eq(challenge.id, challengeId), eq(challenge.status, 'active')),
  })

  if (!challengeRow || challengeRow.settlementStatus !== 'pending') return 'wait'

  const days = await db
    .select()
    .from(day)
    .where(eq(day.challengeId, challengeRow.id))
    .orderBy(asc(day.dayNumber))

  if (days.length !== challengeRow.totalDays) {
    console.error(
      `[settle] challenge ${challengeRow.id}: ledger has ${days.length} days, expected ${challengeRow.totalDays}; refusing to settle`,
    )
    return 'error'
  }

  const windows: DayWindow[] = days.map((d) => ({
    dayNumber: d.dayNumber,
    localDate: d.localDate,
    windowStartUtc: d.windowStartUtc,
    windowEndUtc: d.windowEndUtc,
  }))
  const storedStatuses: DayStatus[] = days.map((d) => d.status)

  const decision = decideSettlement({
    windows,
    storedStatuses,
    dailyStakeAmount: challengeRow.dailyStakeAmount,
    nowUtc: now,
    expectedDayCount: challengeRow.totalDays,
  })

  if (decision.action === 'wait') return 'wait'

  if (decision.action === 'close') {
    const closed = await db
      .update(challenge)
      .set({ status: 'settled', settlementStatus: 'none', settledAt: now })
      .where(and(eq(challenge.id, challengeRow.id), eq(challenge.status, 'active')))
      .returning({ id: challenge.id })
    return closed.length > 0 ? 'settled' : 'already_settling'
  }

  if (!challengeRow.kelviqOrderId) {
    console.error(`[settle] challenge ${challengeRow.id}: no Kelviq order id yet; leaving active`)
    return 'error'
  }

  const acquired = await db
    .update(challenge)
    .set({ status: 'settling' })
    .where(
      and(
        eq(challenge.id, challengeRow.id),
        eq(challenge.status, 'active'),
        eq(challenge.settlementStatus, 'pending'),
      ),
    )
    .returning({ id: challenge.id })

  if (acquired.length === 0) return 'already_settling'

  try {
    const existing = await findSettlementRefund({
      orderId: challengeRow.kelviqOrderId,
      challengeId: challengeRow.id,
    })
    if (existing) {
      await db
        .update(challenge)
        .set({ settlementRefundId: existing.refundId })
        .where(eq(challenge.id, challengeRow.id))
      if (existing.status === 'SUCCEEDED') {
        await db
          .update(challenge)
          .set({ status: 'settled', settlementStatus: 'settled', settledAt: now })
          .where(eq(challenge.id, challengeRow.id))
        return 'settled'
      }
      return 'refunded'
    }

    const refund = await createSettlementRefund({
      orderId: challengeRow.kelviqOrderId,
      amountUnits: decision.amountUnits,
      challengeId: challengeRow.id,
    })
    await db
      .update(challenge)
      .set({ settlementRefundId: refund.refundId })
      .where(eq(challenge.id, challengeRow.id))
    return 'refunded'
  } catch (error) {
    console.error('[settle] refund call failed; leaving challenge in settling:', error)
    return 'error'
  }
}

// Settles each challenge whose days are all resolved, issuing a single idempotent refund of the won-back balance.
export async function settlePendingChallenges(now: Date): Promise<SettlementSweepResult> {
  const errors: string[] = []
  let settled = 0
  let refunded = 0

  const active = await db
    .select({ id: challenge.id })
    .from(challenge)
    .where(and(eq(challenge.status, 'active'), eq(challenge.settlementStatus, 'pending')))

  for (const row of active) {
    try {
      const result = await settleChallenge(row.id, now)
      if (result === 'settled') settled++
      else if (result === 'refunded') refunded++
      else if (result === 'error') errors.push(`challenge ${row.id}: settlement failed`)
    } catch (error) {
      errors.push(`challenge ${row.id}: ${(error as Error).message}`)
    }
  }

  // Recover challenges left in 'settling' whose refund may already exist (missed webhook or
  // a crash between the provider call and our database write).
  const settling = await db
    .select()
    .from(challenge)
    .where(and(eq(challenge.status, 'settling'), eq(challenge.settlementStatus, 'pending')))

  for (const challengeRow of settling) {
    try {
      if (!challengeRow.settlementRefundId) {
        if (!challengeRow.kelviqOrderId) {
          errors.push(`recover challenge ${challengeRow.id}: no Kelviq order id`)
          continue
        }
        const existing = await findSettlementRefund({
          orderId: challengeRow.kelviqOrderId,
          challengeId: challengeRow.id,
        })
        if (existing) {
          await db
            .update(challenge)
            .set({ settlementRefundId: existing.refundId })
            .where(eq(challenge.id, challengeRow.id))
          if (existing.status === 'SUCCEEDED') {
            await db
              .update(challenge)
              .set({ status: 'settled', settlementStatus: 'settled', settledAt: now })
              .where(eq(challenge.id, challengeRow.id))
            settled++
          }
          continue
        }

        const stale = now.getTime() - challengeRow.updatedAt.getTime() > STALE_SETTLEMENT_MS
        if (stale) {
          const released = await db
            .update(challenge)
            .set({ status: 'active' })
            .where(
              and(
                eq(challenge.id, challengeRow.id),
                eq(challenge.status, 'settling'),
                isNull(challenge.settlementRefundId),
              ),
            )
            .returning({ id: challenge.id })
          if (released.length > 0) {
            errors.push(
              `recover challenge ${challengeRow.id}: released stale lock after finding no refund`,
            )
          }
        }
        continue
      }

      const { status } = await retrieveRefundStatus(challengeRow.settlementRefundId)
      if (status === 'SUCCEEDED') {
        await db
          .update(challenge)
          .set({ status: 'settled', settlementStatus: 'settled', settledAt: now })
          .where(eq(challenge.id, challengeRow.id))
        settled++
      } else if (status === 'FAILED' || status === 'CANCELED') {
        await db
          .update(challenge)
          .set({ status: 'active', settlementStatus: 'pending', settlementRefundId: null })
          .where(eq(challenge.id, challengeRow.id))
        errors.push(
          `recover challenge ${challengeRow.id}: refund ${status.toLowerCase()}; will retry`,
        )
      }
    } catch (error) {
      errors.push(`recover challenge ${challengeRow.id}: ${(error as Error).message}`)
    }
  }

  return { settled, refunded, errors }
}
