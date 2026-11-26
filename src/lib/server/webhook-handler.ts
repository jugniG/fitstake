import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm'
import { db, challenge, day, user, kelviqEvent } from '#/db'
import {
  computeDayWindows,
  derivePendingStatus,
  isValidTimeZone,
  resolveStartDayOffset,
} from '#/lib/challenge'
import { isUniqueViolation } from './db-errors'

export type KelviqObject = Record<string, unknown> & {
  id?: string
  metadata?: Record<string, unknown>
  customer_id?: string
  order_id?: string
  status?: string
  order?: { id?: string } | null
}
export type KelviqEvent = { id?: string; type: string; data: { object: KelviqObject } }
export type HandleKelviqEventResult = 'processed' | 'duplicate'

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

class DuplicateKelviqEventError extends Error {}

// The event row and every side effect are committed in one transaction. If a handler throws,
// the event row is rolled back too, so a Kelviq retry is processed instead of being mistaken
// for a duplicate. A duplicate event id fails the insert and is acknowledged without changes.
export async function handleKelviqEvent(
  event: KelviqEvent,
  eventId: string,
): Promise<HandleKelviqEventResult> {
  if (!eventId) throw new Error('Kelviq webhook event id is required.')

  try {
    await db.transaction(async (tx) => {
      try {
        await tx.insert(kelviqEvent).values({
          eventId,
          eventType: event.type,
          payload: event,
        })
      } catch (error) {
        if (isUniqueViolation(error)) throw new DuplicateKelviqEventError()
        throw error
      }

      switch (event.type) {
        case 'checkout.completed':
          await activateChallenge(event, tx)
          return
        case 'order.created':
        case 'order.updated':
          await linkOrder(event, tx)
          return
        case 'refund.created':
        case 'refund.updated':
          await completeRefund(event, tx)
          return
        default:
          return
      }
    })
  } catch (error) {
    if (error instanceof DuplicateKelviqEventError) return 'duplicate'
    throw error
  }

  return 'processed'
}

async function activateChallenge(event: KelviqEvent, tx: DbTransaction): Promise<void> {
  const obj = event.data.object
  const challengeId =
    typeof obj.metadata?.challengeId === 'string' ? obj.metadata.challengeId : null
  const eventUserId = typeof obj.metadata?.userId === 'string' ? obj.metadata.userId : null
  if (!challengeId) {
    console.error('[kelviq] checkout.completed has no challengeId in metadata')
    return
  }

  const lockedChallenges = await tx
    .select()
    .from(challenge)
    .where(eq(challenge.id, challengeId))
    .for('update')
    .limit(1)
  const challengeRow = lockedChallenges.at(0)
  if (!challengeRow) {
    console.error('[kelviq] checkout.completed references unknown challenge', challengeId)
    return
  }
  if (challengeRow.status !== 'pending_charge') return // idempotent: already activated
  if (eventUserId && eventUserId !== challengeRow.userId) {
    throw new Error(
      `checkout.completed metadata user ${eventUserId} does not own challenge ${challengeId}`,
    )
  }
  if (!challengeRow.timezone || challengeRow.startDayOffset == null) {
    throw new Error(`challenge ${challengeId} is missing activation config`)
  }
  if (challengeRow.startDayOffset !== 0 && challengeRow.startDayOffset !== 1) {
    throw new Error(
      `challenge ${challengeId} has an invalid startDayOffset: ${challengeRow.startDayOffset}`,
    )
  }
  if (!isValidTimeZone(challengeRow.timezone)) {
    throw new Error(`challenge ${challengeId} has an invalid timezone: ${challengeRow.timezone}`)
  }

  const activatedAt = new Date()
  const resolution = resolveStartDayOffset({
    chosenOffset: challengeRow.startDayOffset,
    setupAtUtc: challengeRow.createdAt,
    activatedAtUtc: activatedAt,
    timezone: challengeRow.timezone,
  })
  if (resolution.clamped) {
    console.info(
      `[kelviq] challenge ${challengeId}: moved Day 1 to tomorrow (${resolution.reason})`,
    )
  }

  const windows = computeDayWindows({
    activatedAtUtc: activatedAt,
    timezone: challengeRow.timezone,
    startDayOffset: resolution.startDayOffset,
    totalDays: challengeRow.totalDays,
  })
  if (windows.length !== challengeRow.totalDays) {
    throw new Error(
      `challenge ${challengeId} produced ${windows.length} windows, expected ${challengeRow.totalDays}`,
    )
  }

  const customerId = typeof obj.customer_id === 'string' ? obj.customer_id : null
  const eventOrderId = obj.order_id == null ? null : String(obj.order_id)

  const activated = await tx
    .update(challenge)
    .set({
      status: 'active',
      activatedAt,
      day1LocalDate: windows[0].localDate,
      startDayOffset: resolution.startDayOffset,
      kelviqCustomerId: customerId ?? challengeRow.kelviqCustomerId,
      kelviqOrderId: eventOrderId ?? challengeRow.kelviqOrderId,
    })
    .where(and(eq(challenge.id, challengeId), eq(challenge.status, 'pending_charge')))
    .returning({ id: challenge.id })
  if (activated.length === 0) return

  if (customerId) {
    await tx
      .update(user)
      .set({ kelviqCustomerId: customerId })
      .where(and(eq(user.id, challengeRow.userId), isNull(user.kelviqCustomerId)))
  }

  await tx.insert(day).values(
    windows.map((window) => ({
      challengeId,
      dayNumber: window.dayNumber,
      localDate: window.localDate,
      windowStartUtc: window.windowStartUtc,
      windowEndUtc: window.windowEndUtc,
      status: derivePendingStatus(window, activatedAt),
    })),
  )

  // Usually order.created was already linked because the Kelviq customer existed before
  // checkout. If that event was stored while the mapping was missing, reconcile it now.
  if (!eventOrderId && !challengeRow.kelviqOrderId) {
    const orderId = customerId ? await findStoredOrderId(tx, customerId) : null
    if (orderId) {
      await tx
        .update(challenge)
        .set({ kelviqOrderId: orderId })
        .where(eq(challenge.id, challengeId))
    } else {
      console.warn('[kelviq] no order id yet for challenge', challengeId)
    }
  }
}

async function linkOrder(event: KelviqEvent, tx: DbTransaction): Promise<void> {
  const obj = event.data.object
  const orderId = obj.id
  const customerId = obj.customer_id
  if (orderId == null || !customerId) return

  const matchedUsers = await tx
    .select({ id: user.id })
    .from(user)
    .where(or(eq(user.kelviqCustomerId, customerId), eq(user.id, customerId)))
    .limit(1)
  const matchedUser = matchedUsers.at(0)
  if (!matchedUser) return

  // One live challenge per user; the order belongs to it.
  const liveChallenges = await tx
    .select()
    .from(challenge)
    .where(
      and(
        eq(challenge.userId, matchedUser.id),
        inArray(challenge.status, ['pending_charge', 'active', 'settling']),
      ),
    )
    .orderBy(desc(challenge.createdAt))
    .limit(1)
  const challengeRow = liveChallenges.at(0)
  if (!challengeRow || challengeRow.kelviqOrderId) return

  await tx
    .update(challenge)
    .set({ kelviqOrderId: String(orderId) })
    .where(eq(challenge.id, challengeRow.id))
}

async function completeRefund(event: KelviqEvent, tx: DbTransaction): Promise<void> {
  const obj = event.data.object
  if (obj.status !== 'SUCCEEDED') return
  const orderId = obj.order_id ?? obj.order?.id
  const refundId = obj.id
  if (orderId == null || refundId == null) return

  const refundChallenges = await tx
    .select()
    .from(challenge)
    .where(eq(challenge.kelviqOrderId, String(orderId)))
    .limit(1)
  const challengeRow = refundChallenges.at(0)
  if (!challengeRow) {
    console.error('[kelviq] refund.updated references unknown order', orderId)
    return
  }
  if (challengeRow.settlementStatus === 'settled') return // idempotent
  if (challengeRow.status !== 'settling') {
    console.warn('[kelviq] ignoring refund for a challenge that is not settling', challengeRow.id)
    return
  }

  await tx
    .update(challenge)
    .set({
      status: 'settled',
      settlementStatus: 'settled',
      settlementRefundId: String(refundId),
      settledAt: new Date(),
    })
    .where(eq(challenge.id, challengeRow.id))
}

async function findStoredOrderId(tx: DbTransaction, customerId: string): Promise<string | null> {
  const rows = await tx
    .select({ payload: kelviqEvent.payload })
    .from(kelviqEvent)
    .where(inArray(kelviqEvent.eventType, ['order.created', 'order.updated']))
    .orderBy(desc(kelviqEvent.createdAt))
    .limit(100)

  for (const row of rows) {
    const obj = readEventObject(row.payload)
    if (obj?.customer_id === customerId && obj.id != null) return String(obj.id)
  }
  return null
}

function readEventObject(payload: unknown): KelviqObject | null {
  if (!payload || typeof payload !== 'object') return null
  const data = (payload as { data?: { object?: unknown } }).data
  if (!data || typeof data !== 'object') return null
  const object = data.object
  return object && typeof object === 'object' ? (object as KelviqObject) : null
}
