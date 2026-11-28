// Pure app-access rules, shared by the server and the paywall UI.

export const WEEKLY_PRICE_USD = 2
// Stored in cents: 9.99 * 100 is not exactly 999 in floating point, and Dodo charges in cents.
// Must match the price of the Dodo lifetime product (DODO_LIFETIME_PRODUCT_ID).
export const LIFETIME_PRICE_CENTS = 999
// Display form, e.g. "9.99".
export const LIFETIME_PRICE_USD = (LIFETIME_PRICE_CENTS / 100).toFixed(2)
// Both plans. Weekly uses Dodo's own trial; lifetime authorizes the card and the app charges
// the lifetime price when the trial ends (Dodo one-time products can't have trials).
export const TRIAL_DAYS = 3
export const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000

const DAY_MS = 24 * 60 * 60 * 1000

export type SubscriptionSnapshot = {
  status: string
  trialEndsAt: Date | null
  endsAt: Date | null
}

export type AppAccessReason =
  | 'lifetime'
  | 'trial'
  | 'subscribed'
  // The `paywall_enabled` experiment turned the paywall off for this user: no plan needed.
  | 'paywall_off'
  | 'running_challenge'
  | 'none'

// Dodo keeps a trial and a scheduled cancellation as `active`, so access stays on until
// endsAt has actually passed. `on_hold` (failed renewal) turns access off.
export function subscriptionGrantsAccess(
  subscription: SubscriptionSnapshot | null,
  now: Date,
): boolean {
  if (!subscription) return false
  if (subscription.status !== 'active') return false
  if (subscription.endsAt && subscription.endsAt.getTime() <= now.getTime()) return false
  return true
}

function isInTrial(subscription: SubscriptionSnapshot | null, now: Date): boolean {
  return !!subscription?.trialEndsAt && subscription.trialEndsAt.getTime() > now.getTime()
}

export type LifetimeTrialStatus = 'trialing' | 'charging' | 'paid' | 'failed' | 'cancelled'

export type LifetimeTrialSnapshot = {
  status: string
  trialEndsAt: Date
}

// A lifetime trial grants access during its 3 days, and past them while the $9.99 charge is
// due or processing so a slow charge doesn't lock the user out. A trial cancelled before it
// ends keeps access until the end. A failed charge grants nothing.
export function lifetimeTrialGrantsAccess(trial: LifetimeTrialSnapshot | null, now: Date): boolean {
  if (!trial) return false
  if (trial.status === 'trialing' || trial.status === 'charging') return true
  if (trial.status === 'cancelled') return trial.trialEndsAt.getTime() > now.getTime()
  return false
}

// The $9.99 is charged once, after the trial ends, and only if the user didn't cancel.
export function lifetimeTrialChargeDue(trial: LifetimeTrialSnapshot | null, now: Date): boolean {
  return trial?.status === 'trialing' && trial.trialEndsAt.getTime() <= now.getTime()
}

// A user with a running challenge keeps access after a lapse, so a paywall can never stop them
// from recording a day and avoiding a charge.
export function appAccessReason(
  input: {
    hasLifetime: boolean
    subscription: SubscriptionSnapshot | null
    hasRunningChallenge: boolean
    lifetimeTrial?: LifetimeTrialSnapshot | null
    // From the `paywall_enabled` flag; defaults to today's behaviour (paywall on).
    paywallEnabled?: boolean
  },
  now: Date,
): AppAccessReason {
  if (input.hasLifetime) return 'lifetime'
  if (lifetimeTrialGrantsAccess(input.lifetimeTrial ?? null, now)) return 'trial'
  if (subscriptionGrantsAccess(input.subscription, now)) {
    return isInTrial(input.subscription, now) ? 'trial' : 'subscribed'
  }
  if (input.paywallEnabled === false) return 'paywall_off'
  if (input.hasRunningChallenge) return 'running_challenge'
  return 'none'
}

export type ChallengeBlocker = 'no_plan' | 'owes_charges' | null

// Why a user can't start a new challenge, if they can't. The running-challenge exemption only
// covers finishing one; unpaid missed days must be paid first.
export function newChallengeBlocker(input: {
  reason: AppAccessReason
  owedAmount: number
}): ChallengeBlocker {
  const hasPlan =
    input.reason === 'lifetime' ||
    input.reason === 'trial' ||
    input.reason === 'subscribed' ||
    input.reason === 'paywall_off'
  if (!hasPlan) return 'no_plan'
  if (input.owedAmount > 0) return 'owes_charges'
  return null
}

export function canStartChallenge(reason: AppAccessReason): boolean {
  return newChallengeBlocker({ reason, owedAmount: 0 }) === null
}

// One trial per user across both plans. Anyone with a weekly subscription row or a lifetime
// trial row has already used it.
export function trialDaysForCheckout(hasUsedTrial: boolean): number {
  return hasUsedTrial ? 0 : TRIAL_DAYS
}

export type ParsedDodoSubscription = {
  dodoSubscriptionId: string
  productId: string | null
  dodoCustomerId: string | null
  status: string
  onDemand: boolean
  trialEndsAt: Date | null
  currentPeriodEndsAt: Date | null
  endsAt: Date | null
  metadata: Record<string, unknown>
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

function readDate(value: unknown): Date | null {
  const raw = readString(value)
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

// Reads the subscription object from a Dodo `subscription.*` webhook (`event.data`).
export function parseDodoSubscription(
  object: Record<string, unknown>,
): ParsedDodoSubscription | null {
  const dodoSubscriptionId = readString(object.subscription_id)
  const status = readString(object.status)
  if (!dodoSubscriptionId || !status) return null

  const customer = object.customer as { customer_id?: unknown } | null | undefined
  const createdAt = readDate(object.created_at)
  const trialDays = typeof object.trial_period_days === 'number' ? object.trial_period_days : 0
  const nextBillingAt = readDate(object.next_billing_date)
  const cancelledAt = readDate(object.cancelled_at)
  const expiresAt = readDate(object.expires_at)
  const cancelAtPeriodEnd = object.cancel_at_next_billing_date === true

  return {
    dodoSubscriptionId,
    productId: readString(object.product_id),
    dodoCustomerId: readString(customer?.customer_id),
    status: status.toLowerCase(),
    onDemand: object.on_demand === true,
    trialEndsAt:
      createdAt && trialDays > 0 ? new Date(createdAt.getTime() + trialDays * DAY_MS) : null,
    currentPeriodEndsAt: nextBillingAt,
    endsAt: cancelledAt ?? (cancelAtPeriodEnd ? nextBillingAt : null) ?? expiresAt,
    metadata:
      object.metadata && typeof object.metadata === 'object'
        ? (object.metadata as Record<string, unknown>)
        : {},
  }
}
