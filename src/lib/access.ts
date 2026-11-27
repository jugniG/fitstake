// Pure app-access rules, shared by the server and the paywall UI.

export const WEEKLY_PRICE_USD = 2
export const LIFETIME_PRICE_USD = 49
// Applies to the weekly plan only; Kelviq trials need a recurring plan.
export const TRIAL_DAYS = 3

export type SubscriptionSnapshot = {
  status: string
  trialEndsAt: Date | null
  endsAt: Date | null
}

export type AppAccessReason = 'lifetime' | 'trial' | 'subscribed' | 'running_challenge' | 'none'

// Kelviq keeps a scheduled cancellation `active` until the period ends, so access stays on
// until endsAt has actually passed.
export function subscriptionGrantsAccess(
  subscription: SubscriptionSnapshot | null,
  now: Date,
): boolean {
  if (!subscription) return false
  if (subscription.status !== 'trialing' && subscription.status !== 'active') return false
  if (subscription.endsAt && subscription.endsAt.getTime() <= now.getTime()) return false
  return true
}

// A user with money staked in a running challenge keeps access after a lapse, so a paywall can
// never forfeit their daily stakes.
export function appAccessReason(
  input: {
    hasLifetime: boolean
    subscription: SubscriptionSnapshot | null
    hasRunningChallenge: boolean
  },
  now: Date,
): AppAccessReason {
  if (input.hasLifetime) return 'lifetime'
  if (subscriptionGrantsAccess(input.subscription, now)) {
    return input.subscription?.status === 'trialing' ? 'trial' : 'subscribed'
  }
  if (input.hasRunningChallenge) return 'running_challenge'
  return 'none'
}

// Starting a new pot needs a live subscription; the running-challenge exemption only covers
// finishing one.
export function canStartChallenge(reason: AppAccessReason): boolean {
  return reason === 'lifetime' || reason === 'trial' || reason === 'subscribed'
}

// One trial per user. Anyone who has ever had a subscription row already used it.
export function trialDaysForCheckout(hasPreviousSubscription: boolean): number {
  return hasPreviousSubscription ? 0 : TRIAL_DAYS
}

export type ParsedSubscriptionObject = {
  kelviqSubscriptionId: string
  planIdentifier: string | null
  userId: string | null
  kelviqCustomerId: string | null
  status: string
  trialEndsAt: Date | null
  currentPeriodEndsAt: Date | null
  endsAt: Date | null
  modifiedAt: Date | null
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

// `end_date` is a plain date (yyyy-MM-dd); the subscription runs through the end of that day.
function readEndDate(value: unknown): Date | null {
  const raw = readString(value)
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return readDate(`${raw}T23:59:59Z`)
  return readDate(raw)
}

export function parseSubscriptionObject(
  object: Record<string, unknown>,
): ParsedSubscriptionObject | null {
  const kelviqSubscriptionId = readString(object.id)
  const status = readString(object.status)
  if (!kelviqSubscriptionId || !status) return null

  const plan = object.plan as { identifier?: unknown } | null | undefined
  const customer = object.customer as { id?: unknown; customer_id?: unknown } | null | undefined

  return {
    kelviqSubscriptionId,
    planIdentifier: readString(plan?.identifier),
    // Kelviq customers are registered with our user id as the client-defined customer id.
    userId: readString(customer?.customer_id),
    kelviqCustomerId: readString(customer?.id),
    status: status.toLowerCase(),
    trialEndsAt: readDate(object.trial_end),
    currentPeriodEndsAt: readDate(object.billing_period_end_time),
    endsAt: readEndDate(object.end_date),
    modifiedAt: readDate(object.modified_on),
  }
}
