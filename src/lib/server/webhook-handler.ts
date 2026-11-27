import { and, eq, inArray } from 'drizzle-orm'
import {
  db,
  challenge,
  day,
  lifetimeAccess,
  lifetimeTrial,
  paymentEvent,
  stakeCharge,
  user,
  userSubscription,
} from '#/db.server'
import { env } from '#/lib/env'
import { TRIAL_MS, parseDodoSubscription, subscriptionGrantsAccess } from '#/lib/access'
import type { ParsedDodoSubscription } from '#/lib/access'
import {
  computeDayWindows,
  derivePendingStatus,
  isValidTimeZone,
  nextAttemptAt,
  resolveStartDayOffset,
} from '#/lib/challenge'
import { cancelSubscriptionNow } from '#/lib/dodo/charges'
import { CHECKOUT_KIND } from '#/lib/dodo/checkout'
import { isUniqueViolation } from './db-errors'

export type DodoWebhookEvent = {
  type: string
  timestamp?: string
  data: Record<string, unknown>
}
export type HandleDodoEventResult = 'processed' | 'duplicate'

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

class DuplicateDodoEventError extends Error {}

const MANDATE_LOST_EVENTS = new Set([
  'subscription.cancelled',
  'subscription.failed',
  'subscription.expired',
])

// The event row and every side effect commit in one transaction. If a handler throws, the
// event row rolls back too, so Dodo's retry is processed instead of being mistaken for a
// duplicate. A repeated webhook-id fails the insert and is acknowledged without changes.
export async function handleDodoEvent(
  event: DodoWebhookEvent,
  webhookId: string,
): Promise<HandleDodoEventResult> {
  if (!webhookId) throw new Error('Dodo webhook-id header is required.')

  // A Dodo subscription to cancel once the transaction commits: a weekly plan superseded by
  // lifetime, or a lifetime-trial mandate that has been paid.
  let subscriptionToCancel: string | null = null
  try {
    subscriptionToCancel = await db.transaction(async (tx): Promise<string | null> => {
      try {
        await tx.insert(paymentEvent).values({ webhookId, eventType: event.type, payload: event })
      } catch (error) {
        if (isUniqueViolation(error)) throw new DuplicateDodoEventError()
        throw error
      }

      if (event.type.startsWith('subscription.')) {
        const parsed = parseDodoSubscription(event.data)
        if (!parsed) {
          console.error('[webhook] subscription event without id or status:', event.type)
          return null
        }
        if (isLifetimeTrialMandate(parsed))
          return handleLifetimeTrialMandate(event.type, parsed, tx)
        if (isStakeMandate(parsed)) {
          await handleMandateEvent(event.type, parsed, tx)
          return null
        }
        if (isWeeklyPlan(parsed)) return syncWeeklySubscription(event, parsed, tx)
        console.info('[webhook] ignoring subscription for another product:', parsed.productId)
        return null
      }

      if (event.type === 'payment.succeeded' || event.type === 'payment.failed') {
        return handlePaymentEvent(event, tx)
      }

      console.info('[webhook] unhandled event type:', event.type)
      return null
    })
  } catch (error) {
    if (error instanceof DuplicateDodoEventError) return 'duplicate'
    throw error
  }

  // After commit: a lifetime grant must not roll back if Dodo's cancel call fails. Logged
  // loudly because a weekly plan would keep billing.
  if (subscriptionToCancel) {
    try {
      await cancelSubscriptionNow(subscriptionToCancel)
    } catch (error) {
      console.error(
        `[webhook] ACTION NEEDED: lifetime user still has subscription ${subscriptionToCancel}; cancel failed:`,
        error,
      )
    }
  }
  return 'processed'
}

// Product ids are server-controlled, so they decide the kind; metadata is only a fallback.
function isLifetimeTrialMandate(parsed: ParsedDodoSubscription): boolean {
  if (
    env.DODO_LIFETIME_TRIAL_PRODUCT_ID &&
    parsed.productId === env.DODO_LIFETIME_TRIAL_PRODUCT_ID
  ) {
    return true
  }
  return parsed.onDemand && parsed.metadata.kind === CHECKOUT_KIND.lifetimeTrial
}

function isStakeMandate(parsed: ParsedDodoSubscription): boolean {
  if (env.DODO_STAKE_PRODUCT_ID && parsed.productId === env.DODO_STAKE_PRODUCT_ID) return true
  return parsed.onDemand && parsed.metadata.kind === CHECKOUT_KIND.stakeMandate
}

function isWeeklyPlan(parsed: ParsedDodoSubscription): boolean {
  if (env.DODO_WEEKLY_PRODUCT_ID && parsed.productId === env.DODO_WEEKLY_PRODUCT_ID) return true
  return !parsed.onDemand && parsed.metadata.kind === CHECKOUT_KIND.weekly
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

// Resolves the user from the Dodo customer id we stored at checkout. Metadata alone is never
// trusted to pick the account.
async function findUserByDodoCustomer(
  tx: DbTransaction,
  dodoCustomerId: string | null,
): Promise<string | null> {
  if (!dodoCustomerId) return null
  const owner = (
    await tx
      .select({ id: user.id })
      .from(user)
      .where(eq(user.dodoCustomerId, dodoCustomerId))
      .limit(1)
  ).at(0)
  return owner?.id ?? null
}

// ── Stake mandates ──

async function handleMandateEvent(
  type: string,
  parsed: ParsedDodoSubscription,
  tx: DbTransaction,
): Promise<void> {
  const linked = (
    await tx
      .select()
      .from(challenge)
      .where(eq(challenge.dodoSubscriptionId, parsed.dodoSubscriptionId))
      .for('update')
      .limit(1)
  ).at(0)

  if (!linked) {
    if (type === 'subscription.active') await activateChallenge(parsed, tx)
    return
  }

  if (type === 'subscription.active') {
    // Re-authorized (new card or recovered mandate). Give unpaid days a fresh retry run on the
    // new card instead of leaving them failed or abandoned.
    if (linked.status === 'mandate_lost') {
      await tx.update(challenge).set({ status: 'active' }).where(eq(challenge.id, linked.id))
    }
    const now = new Date()
    await tx
      .update(stakeCharge)
      .set({ status: 'failed', attempts: 0, firstAttemptAt: now, nextAttemptAt: now })
      .where(
        and(
          eq(stakeCharge.challengeId, linked.id),
          inArray(stakeCharge.status, ['failed', 'abandoned']),
        ),
      )
    return
  }

  if (MANDATE_LOST_EVENTS.has(type) && linked.status === 'active') {
    console.warn(`[webhook] challenge ${linked.id}: card mandate ended (${type})`)
    await tx.update(challenge).set({ status: 'mandate_lost' }).where(eq(challenge.id, linked.id))
    return
  }

  if (type === 'subscription.on_hold') {
    // On-demand mandates stay chargeable on hold; the failed payment drives the retry schedule.
    console.info(`[webhook] challenge ${linked.id}: mandate on hold after a failed charge`)
  }
}

async function activateChallenge(parsed: ParsedDodoSubscription, tx: DbTransaction): Promise<void> {
  const challengeId = readString(parsed.metadata.challengeId)
  if (!challengeId) {
    console.error('[webhook] stake mandate activated without a challengeId in metadata')
    return
  }

  const row = (
    await tx.select().from(challenge).where(eq(challenge.id, challengeId)).for('update').limit(1)
  ).at(0)
  if (!row) {
    console.error('[webhook] stake mandate references unknown challenge', challengeId)
    return
  }
  if (row.status !== 'pending_mandate' && row.status !== 'mandate_lost') return // already active

  const ownerId = await findUserByDodoCustomer(tx, parsed.dodoCustomerId)
  if (ownerId !== row.userId) {
    throw new Error(
      `stake mandate ${parsed.dodoSubscriptionId} customer does not own challenge ${challengeId}`,
    )
  }

  // Re-authorization after a lost mandate: the days already exist; swap in the new mandate and
  // give unpaid days a fresh retry run on it.
  if (row.status === 'mandate_lost') {
    const now = new Date()
    await tx
      .update(challenge)
      .set({ status: 'active', dodoSubscriptionId: parsed.dodoSubscriptionId })
      .where(and(eq(challenge.id, challengeId), eq(challenge.status, 'mandate_lost')))
    await tx
      .update(stakeCharge)
      .set({ status: 'failed', attempts: 0, firstAttemptAt: now, nextAttemptAt: now })
      .where(
        and(
          eq(stakeCharge.challengeId, challengeId),
          inArray(stakeCharge.status, ['failed', 'abandoned']),
        ),
      )
    return
  }
  if (!isValidTimeZone(row.timezone)) {
    throw new Error(`challenge ${challengeId} has an invalid timezone: ${row.timezone}`)
  }
  if (row.startDayOffset !== 0 && row.startDayOffset !== 1) {
    throw new Error(`challenge ${challengeId} has an invalid startDayOffset: ${row.startDayOffset}`)
  }

  const activatedAt = new Date()
  const resolution = resolveStartDayOffset({
    chosenOffset: row.startDayOffset,
    setupAtUtc: row.createdAt,
    activatedAtUtc: activatedAt,
    timezone: row.timezone,
  })
  if (resolution.clamped) {
    console.info(
      `[webhook] challenge ${challengeId}: moved Day 1 to tomorrow (${resolution.reason})`,
    )
  }

  const windows = computeDayWindows({
    activatedAtUtc: activatedAt,
    timezone: row.timezone,
    startDayOffset: resolution.startDayOffset,
    totalDays: row.totalDays,
  })
  if (windows.length !== row.totalDays) {
    throw new Error(
      `challenge ${challengeId} produced ${windows.length} windows, expected ${row.totalDays}`,
    )
  }

  await tx
    .update(challenge)
    .set({
      status: 'active',
      activatedAt,
      day1LocalDate: windows[0].localDate,
      startDayOffset: resolution.startDayOffset,
      dodoSubscriptionId: parsed.dodoSubscriptionId,
    })
    .where(and(eq(challenge.id, challengeId), eq(challenge.status, 'pending_mandate')))

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
}

// ── Lifetime trial ──

async function handleLifetimeTrialMandate(
  type: string,
  parsed: ParsedDodoSubscription,
  tx: DbTransaction,
): Promise<string | null> {
  const ownerId = await findUserByDodoCustomer(tx, parsed.dodoCustomerId)
  if (!ownerId) {
    console.error('[webhook] lifetime trial for unknown customer', parsed.dodoSubscriptionId)
    return null
  }

  const existing = (
    await tx
      .select()
      .from(lifetimeTrial)
      .where(eq(lifetimeTrial.dodoSubscriptionId, parsed.dodoSubscriptionId))
      .for('update')
      .limit(1)
  ).at(0)

  if (type === 'subscription.active') {
    if (existing) return null
    // The trial end is set from our clock on activation, not from the client or the payload.
    await tx
      .insert(lifetimeTrial)
      .values({
        userId: ownerId,
        dodoSubscriptionId: parsed.dodoSubscriptionId,
        status: 'trialing',
        trialEndsAt: new Date(Date.now() + TRIAL_MS),
      })
      .onConflictDoNothing()
    return null
  }

  // Cancelled before the trial ended: keep access until the end and never charge.
  if (MANDATE_LOST_EVENTS.has(type) && existing?.status === 'trialing') {
    await tx
      .update(lifetimeTrial)
      .set({ status: 'cancelled' })
      .where(eq(lifetimeTrial.id, existing.id))
  }
  return null
}

async function settleLifetimeTrialPayment(
  type: string,
  paymentId: string,
  payment: Record<string, unknown>,
  metadata: Record<string, unknown>,
  tx: DbTransaction,
): Promise<string | null> {
  const subscriptionId = readString(payment.subscription_id)
  const trialId = readString(metadata.trialId)
  const trial = (
    await tx
      .select()
      .from(lifetimeTrial)
      .where(
        subscriptionId
          ? eq(lifetimeTrial.dodoSubscriptionId, subscriptionId)
          : eq(lifetimeTrial.id, trialId ?? ''),
      )
      .for('update')
      .limit(1)
  ).at(0)
  if (!trial) {
    console.error('[webhook] lifetime trial payment matches no trial:', paymentId)
    return null
  }

  if (type === 'payment.failed') {
    const reason = readString(payment.error_message) ?? readString(payment.error_code)
    console.warn(`[webhook] lifetime trial charge ${paymentId} failed: ${reason ?? 'unknown'}`)
    await tx
      .update(lifetimeTrial)
      .set({ status: 'failed', dodoPaymentId: paymentId, failureMessage: reason })
      .where(and(eq(lifetimeTrial.id, trial.id), eq(lifetimeTrial.status, 'charging')))
    return null
  }

  await tx
    .update(lifetimeTrial)
    .set({ status: 'paid', dodoPaymentId: paymentId })
    .where(eq(lifetimeTrial.id, trial.id))
  await tx
    .insert(lifetimeAccess)
    .values({
      userId: trial.userId,
      dodoPaymentId: paymentId,
      amountCents: typeof payment.total_amount === 'number' ? payment.total_amount : null,
      currency: readString(payment.currency),
    })
    .onConflictDoNothing()
  // Paid: the mandate has done its job. Cancelled after commit like the weekly plan.
  return trial.dodoSubscriptionId
}

// ── Weekly plan ──

// Returns the weekly subscription id to cancel after commit when the user already has
// lifetime access (e.g. bought both in two tabs).
async function syncWeeklySubscription(
  event: DodoWebhookEvent,
  parsed: ParsedDodoSubscription,
  tx: DbTransaction,
): Promise<string | null> {
  const ownerId = await findUserByDodoCustomer(tx, parsed.dodoCustomerId)
  if (!ownerId) {
    console.error('[webhook] weekly subscription for unknown customer', parsed.dodoSubscriptionId)
    return null
  }

  // Dodo sends several subscription events at once (e.g. active + failed). Locking the user row
  // serializes them; locking the subscription row alone doesn't, because before the first
  // insert there is no row to lock and both events would insert.
  await tx.select({ id: user.id }).from(user).where(eq(user.id, ownerId)).for('update')

  const existing = (
    await tx.select().from(userSubscription).where(eq(userSubscription.userId, ownerId)).limit(1)
  ).at(0)

  const now = new Date()
  const eventAt = event.timestamp ? new Date(event.timestamp) : null
  const incoming = { status: parsed.status, trialEndsAt: parsed.trialEndsAt, endsAt: parsed.endsAt }
  if (existing) {
    const sameSubscription = existing.dodoSubscriptionId === parsed.dodoSubscriptionId
    const isStale =
      sameSubscription &&
      !!existing.sourceEventAt &&
      !!eventAt &&
      eventAt.getTime() < existing.sourceEventAt.getTime()
    // A superseded subscription's late cancel event must not revoke a newer live one.
    const wouldRevokeNewer =
      !sameSubscription &&
      subscriptionGrantsAccess(existing, now) &&
      !subscriptionGrantsAccess(incoming, now)
    if (isStale || wouldRevokeNewer) return null
  }

  const values = {
    dodoSubscriptionId: parsed.dodoSubscriptionId,
    status: parsed.status,
    trialEndsAt: parsed.trialEndsAt,
    currentPeriodEndsAt: parsed.currentPeriodEndsAt,
    endsAt: parsed.endsAt,
    sourceEventAt: eventAt,
  }
  if (existing) {
    await tx.update(userSubscription).set(values).where(eq(userSubscription.id, existing.id))
  } else {
    await tx.insert(userSubscription).values({ userId: ownerId, ...values })
  }

  if (!subscriptionGrantsAccess(incoming, now)) return null
  const purchase = (
    await tx
      .select({ id: lifetimeAccess.id })
      .from(lifetimeAccess)
      .where(eq(lifetimeAccess.userId, ownerId))
      .limit(1)
  ).at(0)
  return purchase ? parsed.dodoSubscriptionId : null
}

// ── Payments ──

async function handlePaymentEvent(
  event: DodoWebhookEvent,
  tx: DbTransaction,
): Promise<string | null> {
  const payment = event.data
  const paymentId = readString(payment.payment_id)
  if (!paymentId) {
    console.error('[webhook] payment event without payment_id:', event.type)
    return null
  }
  // A card update on a mandate creates a setup payment; it is not a stake or a purchase.
  if (payment.is_update_payment_method === true) return null

  const metadata =
    payment.metadata && typeof payment.metadata === 'object'
      ? (payment.metadata as Record<string, unknown>)
      : {}

  if (metadata.kind === CHECKOUT_KIND.stakeCharge) {
    await settleStakePayment(event.type, paymentId, payment, metadata, tx)
    return null
  }
  if (metadata.kind === CHECKOUT_KIND.lifetimeTrialCharge) {
    return settleLifetimeTrialPayment(event.type, paymentId, payment, metadata, tx)
  }

  if (event.type === 'payment.succeeded' && isLifetimePurchase(payment)) {
    return grantLifetimeAccess(paymentId, payment, tx)
  }
  return null
}

async function settleStakePayment(
  type: string,
  paymentId: string,
  payment: Record<string, unknown>,
  metadata: Record<string, unknown>,
  tx: DbTransaction,
): Promise<void> {
  let rows = await tx
    .select()
    .from(stakeCharge)
    .where(eq(stakeCharge.dodoPaymentId, paymentId))
    .for('update')

  // The webhook can arrive before the charge response was stored; fall back to the claim.
  const claimId = readString(metadata.claimId)
  if (rows.length === 0 && claimId) {
    rows = await tx.select().from(stakeCharge).where(eq(stakeCharge.claimId, claimId)).for('update')
  }
  if (rows.length === 0) {
    console.error('[webhook] stake payment matches no charge rows:', paymentId)
    return
  }

  const subscriptionId = readString(payment.subscription_id)
  if (subscriptionId) {
    const owner = (
      await tx
        .select({ dodoSubscriptionId: challenge.dodoSubscriptionId })
        .from(challenge)
        .where(eq(challenge.id, rows[0].challengeId))
        .limit(1)
    ).at(0)
    if (owner?.dodoSubscriptionId !== subscriptionId) {
      throw new Error(`stake payment ${paymentId} is not on the challenge's mandate`)
    }
  }

  if (type === 'payment.succeeded') {
    await tx
      .update(stakeCharge)
      .set({ status: 'succeeded', dodoPaymentId: paymentId, nextAttemptAt: null })
      .where(
        and(
          inArray(
            stakeCharge.id,
            rows.map((row) => row.id),
          ),
          inArray(stakeCharge.status, ['claimed', 'pending', 'failed']),
        ),
      )
    return
  }

  const declineCode = readString(payment.error_code)
  const declineMessage = readString(payment.error_message)
  console.warn(`[webhook] stake payment ${paymentId} failed: ${declineCode ?? 'unknown'}`)
  for (const row of rows) {
    if (row.status !== 'claimed' && row.status !== 'pending') continue
    const retryAt = nextAttemptAt(row.firstAttemptAt ?? row.createdAt, row.attempts, declineCode)
    await tx
      .update(stakeCharge)
      .set({
        status: retryAt ? 'failed' : 'abandoned',
        dodoPaymentId: paymentId,
        nextAttemptAt: retryAt,
        lastDeclineCode: declineCode,
        lastDeclineMessage: declineMessage,
      })
      .where(eq(stakeCharge.id, row.id))
  }
}

function isLifetimePurchase(payment: Record<string, unknown>): boolean {
  if (!env.DODO_LIFETIME_PRODUCT_ID) return false
  const cart = Array.isArray(payment.product_cart) ? payment.product_cart : []
  return cart.some(
    (item) =>
      !!item &&
      typeof item === 'object' &&
      (item as { product_id?: unknown }).product_id === env.DODO_LIFETIME_PRODUCT_ID,
  )
}

async function grantLifetimeAccess(
  paymentId: string,
  payment: Record<string, unknown>,
  tx: DbTransaction,
): Promise<string | null> {
  const customer = payment.customer as { customer_id?: unknown } | null | undefined
  const ownerId = await findUserByDodoCustomer(tx, readString(customer?.customer_id))
  if (!ownerId) {
    console.error('[webhook] lifetime payment for unknown customer', paymentId)
    return null
  }

  // A second purchase by the same user (two tabs) keeps the first row; access is already granted.
  await tx
    .insert(lifetimeAccess)
    .values({
      userId: ownerId,
      dodoPaymentId: paymentId,
      amountCents: typeof payment.total_amount === 'number' ? payment.total_amount : null,
      currency: readString(payment.currency),
    })
    .onConflictDoNothing()

  const weekly = (
    await tx.select().from(userSubscription).where(eq(userSubscription.userId, ownerId)).limit(1)
  ).at(0)
  return weekly && subscriptionGrantsAccess(weekly, new Date()) ? weekly.dodoSubscriptionId : null
}
