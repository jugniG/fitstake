import { and, eq, inArray, lte } from 'drizzle-orm'
import { db, challenge, day, stakeCharge } from '#/db.server'
import {
  chargeDescription,
  currentDayStatus,
  dueChargeDays,
  isStaleClaim,
  nextAttemptAt,
  stakeIdempotencyKey,
} from '#/lib/challenge'
import type { DayWindow } from '#/lib/challenge'
import { cancelSubscriptionNow, chargeMissedDays } from '#/lib/dodo/charges'

export type ChargeRunResult =
  'charged' | 'nothing_due' | 'in_flight' | 'not_chargeable' | 'deferred' | 'failed'

function toWindow(row: typeof day.$inferSelect): DayWindow {
  return {
    dayNumber: row.dayNumber,
    localDate: row.localDate,
    windowStartUtc: row.windowStartUtc,
    windowEndUtc: row.windowEndUtc,
  }
}

// Persists the time-derived day statuses: past days become forfeited, today's becomes pending.
// The conditional WHERE keeps this from overwriting a completion that landed first.
export async function syncLapsedDays(challengeId: string, now: Date): Promise<void> {
  const days = await db.select().from(day).where(eq(day.challengeId, challengeId))
  const lapsed: number[] = []
  const opened: number[] = []
  for (const row of days) {
    const derived = currentDayStatus(row.status, toWindow(row), now)
    if ((row.status === 'locked' || row.status === 'pending') && derived === 'forfeited') {
      lapsed.push(row.dayNumber)
    } else if (row.status === 'locked' && derived === 'pending') {
      opened.push(row.dayNumber)
    }
  }
  if (lapsed.length > 0) {
    await db
      .update(day)
      .set({ status: 'forfeited' })
      .where(
        and(
          eq(day.challengeId, challengeId),
          inArray(day.dayNumber, lapsed),
          inArray(day.status, ['locked', 'pending']),
        ),
      )
  }
  if (opened.length > 0) {
    await db
      .update(day)
      .set({ status: 'pending' })
      .where(
        and(
          eq(day.challengeId, challengeId),
          inArray(day.dayNumber, opened),
          eq(day.status, 'locked'),
        ),
      )
  }
}

type Claim = { claimId: string; dayNumbers: number[]; amountCents: number; description: string }

// Claims the days to charge inside one transaction. The challenge row lock serializes
// concurrent runs (dashboard + cron) for the same challenge, and the unique
// (challengeId, dayNumber) row guarantees a day is never claimed twice.
async function claimDueDays(
  challengeId: string,
  now: Date,
): Promise<{ claim: Claim } | { skip: ChargeRunResult }> {
  return db.transaction(async (tx) => {
    const locked = (
      await tx.select().from(challenge).where(eq(challenge.id, challengeId)).for('update').limit(1)
    ).at(0)
    if (!locked || locked.status !== 'active' || !locked.dodoSubscriptionId) {
      return { skip: 'not_chargeable' as const }
    }

    const [days, charges] = await Promise.all([
      tx.select().from(day).where(eq(day.challengeId, challengeId)),
      tx.select().from(stakeCharge).where(eq(stakeCharge.challengeId, challengeId)),
    ])
    const daysByNumber = new Map(days.map((row) => [row.dayNumber, row]))
    const amountCents = locked.dailyStakeAmount * 100

    // Dodo rejects a new charge while one is processing; wait for its webhook.
    if (charges.some((charge) => charge.status === 'pending')) return { skip: 'in_flight' as const }

    // A claim that never got a Dodo payment id. Recent: still in flight. Old: the request
    // crashed, so re-send it with the same claimId (same idempotency key).
    const claimed = charges.filter((charge) => charge.status === 'claimed')
    if (claimed.length > 0) {
      const claimedAt = claimed[0].claimedAt
      if (!isStaleClaim(claimedAt, now)) return { skip: 'in_flight' as const }
      const claimId = claimed[0].claimId
      if (!claimId) return { skip: 'failed' as const }
      const sameClaim = claimed.filter((charge) => charge.claimId === claimId)
      await tx.update(stakeCharge).set({ claimedAt: now }).where(eq(stakeCharge.claimId, claimId))
      return {
        claim: {
          claimId,
          dayNumbers: sameClaim.map((charge) => charge.dayNumber),
          amountCents: sameClaim.reduce((sum, charge) => sum + charge.amountCents, 0),
          description: chargeDescription(
            sameClaim.map((charge) => ({
              dayNumber: charge.dayNumber,
              localDate: daysByNumber.get(charge.dayNumber)?.localDate ?? '',
            })),
          ),
        },
      }
    }

    const dueNumbers = dueChargeDays(
      days.map((row) => ({ dayNumber: row.dayNumber, status: row.status })),
      charges.map((charge) => ({
        dayNumber: charge.dayNumber,
        status: charge.status,
        nextAttemptAt: charge.nextAttemptAt,
      })),
      now,
    )
    if (dueNumbers.length === 0) return { skip: 'nothing_due' as const }

    const claimId = crypto.randomUUID()
    const existingByDay = new Map(charges.map((charge) => [charge.dayNumber, charge]))
    for (const dayNumber of dueNumbers) {
      const existing = existingByDay.get(dayNumber)
      if (existing) {
        await tx
          .update(stakeCharge)
          .set({
            status: 'claimed',
            claimId,
            claimedAt: now,
            dodoPaymentId: null,
            attempts: existing.attempts + 1,
          })
          .where(and(eq(stakeCharge.id, existing.id), eq(stakeCharge.status, 'failed')))
      } else {
        await tx.insert(stakeCharge).values({
          challengeId,
          dayNumber,
          amountCents,
          status: 'claimed',
          claimId,
          claimedAt: now,
          attempts: 1,
          firstAttemptAt: now,
        })
      }
    }

    return {
      claim: {
        claimId,
        dayNumbers: dueNumbers,
        amountCents: dueNumbers.length * amountCents,
        description: chargeDescription(
          dueNumbers.map((dayNumber) => ({
            dayNumber,
            localDate: daysByNumber.get(dayNumber)?.localDate ?? '',
          })),
        ),
      },
    }
  })
}

// Marks every row of a claim failed (with its own retry time) or abandoned.
export async function recordClaimFailure(
  rows: Array<typeof stakeCharge.$inferSelect>,
  declineCode: string | null,
  declineMessage: string | null,
): Promise<void> {
  for (const row of rows) {
    const retryAt = nextAttemptAt(row.firstAttemptAt ?? row.createdAt, row.attempts, declineCode)
    await db
      .update(stakeCharge)
      .set({
        status: retryAt ? 'failed' : 'abandoned',
        nextAttemptAt: retryAt,
        lastDeclineCode: declineCode,
        lastDeclineMessage: declineMessage,
      })
      .where(and(eq(stakeCharge.id, row.id), inArray(stakeCharge.status, ['claimed', 'pending'])))
  }
}

// Charges every missed day of one challenge that is due, in a single Dodo payment. Safe to
// call on every app open and from the cron: it never charges a day twice.
export async function chargeDueDays(
  challengeId: string,
  now = new Date(),
): Promise<ChargeRunResult> {
  await syncLapsedDays(challengeId, now)

  const claimed = await claimDueDays(challengeId, now)
  if ('skip' in claimed) return claimed.skip
  const { claim } = claimed

  const challengeRow = await db.query.challenge.findFirst({
    where: eq(challenge.id, challengeId),
    columns: { dodoSubscriptionId: true },
  })
  if (!challengeRow?.dodoSubscriptionId) return 'not_chargeable'

  const result = await chargeMissedDays({
    subscriptionId: challengeRow.dodoSubscriptionId,
    amountCents: claim.amountCents,
    description: claim.description,
    challengeId,
    claimId: claim.claimId,
    dayNumbers: claim.dayNumbers,
    idempotencyKey: stakeIdempotencyKey(claim.claimId),
  })

  if (result.outcome === 'submitted') {
    await db
      .update(stakeCharge)
      .set({ status: 'pending', dodoPaymentId: result.paymentId })
      .where(and(eq(stakeCharge.claimId, claim.claimId), eq(stakeCharge.status, 'claimed')))
    return 'charged'
  }

  // A payment is still processing on Dodo's side. Leave the claim; it is re-sent with the same
  // idempotency key once it goes stale.
  if (result.outcome === 'busy') return 'deferred'

  console.error(
    `[stake-charge] challenge ${challengeId} claim ${claim.claimId} failed:`,
    result.message,
  )
  const rows = await db.select().from(stakeCharge).where(eq(stakeCharge.claimId, claim.claimId))
  await recordClaimFailure(rows, null, result.message)
  return 'failed'
}

// Closes a challenge once every day is decided and every missed day is paid, and ends its
// card mandate so no further charge is possible. Unpaid days keep it open for "Update card".
export async function finishChallengeIfDone(
  challengeId: string,
  now = new Date(),
): Promise<boolean> {
  const challengeRow = await db.query.challenge.findFirst({
    where: eq(challenge.id, challengeId),
    with: { days: true, charges: true },
  })
  if (challengeRow?.status !== 'active') return false
  if (challengeRow.days.length !== challengeRow.totalDays) return false

  const allDecided = challengeRow.days.every((row) => {
    const status = currentDayStatus(row.status, toWindow(row), now)
    return status === 'completed' || status === 'forfeited'
  })
  if (!allDecided) return false

  const missed = challengeRow.days.filter((row) => row.status === 'forfeited').length
  const paid = challengeRow.charges.filter((charge) => charge.status === 'succeeded').length
  if (paid < missed) return false

  const closed = await db
    .update(challenge)
    .set({ status: 'completed', completedAt: now })
    .where(and(eq(challenge.id, challengeId), eq(challenge.status, 'active')))
    .returning({ dodoSubscriptionId: challenge.dodoSubscriptionId })
  const subscriptionId = closed.at(0)?.dodoSubscriptionId
  if (closed.length === 0) return false

  if (subscriptionId) {
    try {
      await cancelSubscriptionNow(subscriptionId)
    } catch (error) {
      // The challenge is closed in our database, so no further charge is ever claimed for it;
      // the leftover mandate is harmless but should be cleaned up.
      console.error(
        `[stake-charge] challenge ${challengeId} closed but its mandate ${subscriptionId} could not be cancelled:`,
        error,
      )
    }
  }
  return true
}

// Cron backstop: charges users who stopped opening the app.
export async function chargeAllDueChallenges(now = new Date()): Promise<{
  processed: number
  results: Record<string, ChargeRunResult>
  errors: string[]
}> {
  const active = await db
    .select({ id: challenge.id })
    .from(challenge)
    .where(and(eq(challenge.status, 'active'), lte(challenge.activatedAt, now)))

  const results: Record<string, ChargeRunResult> = {}
  const errors: string[] = []
  for (const row of active) {
    try {
      results[row.id] = await chargeDueDays(row.id, now)
      await finishChallengeIfDone(row.id, now)
    } catch (error) {
      console.error(`[stake-charge] cron run failed for challenge ${row.id}:`, error)
      errors.push(`challenge ${row.id}: ${(error as Error).message}`)
    }
  }
  return { processed: active.length, results, errors }
}
