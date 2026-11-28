import { and, eq } from 'drizzle-orm'
import { db, challenge, lifetimeAccess, lifetimeTrial, userSubscription } from '#/db.server'
import { ensureSession } from '#/lib/auth.functions'
import {
  createLifetimeCheckout,
  createLifetimeTrialCheckout,
  createWeeklyCheckout,
} from '#/lib/dodo/checkout'
import { ensureDodoCustomer } from '#/lib/dodo/customers'
import {
  appAccessReason,
  lifetimeTrialChargeDue,
  lifetimeTrialGrantsAccess,
  subscriptionGrantsAccess,
  trialDaysForCheckout,
} from '#/lib/access'
import type { AppAccessReason } from '#/lib/access'
import { chargeLifetimeTrialIfDue } from './lifetime-trial.server'
import { isPaywallEnabled } from '#/lib/flagsmith.server'
import type { AccessPlan, AppAccess, CurrentPlan } from './access'

type SessionUser = { id: string; email: string; name: string }

const RECENT_FAILURE_MS = 15 * 60 * 1000

// A weekly subscription that `failed` was never created (declined card, abandoned mandate), so
// the user never got their trial and keeps it.
function hasUsedTrial(
  subscription: { status: string } | null,
  trial: { status: string } | null,
): boolean {
  return (!!subscription && subscription.status !== 'failed') || !!trial
}

async function loadAccessRows(userId: string) {
  const [purchase, subscription, trial, runningChallenge] = await Promise.all([
    db.query.lifetimeAccess.findFirst({
      where: eq(lifetimeAccess.userId, userId),
      columns: { id: true },
    }),
    db.query.userSubscription.findFirst({ where: eq(userSubscription.userId, userId) }),
    db.query.lifetimeTrial.findFirst({ where: eq(lifetimeTrial.userId, userId) }),
    db.query.challenge.findFirst({
      where: and(
        eq(challenge.userId, userId),
        eq(challenge.status, 'active'),
      ),
      columns: { id: true },
    }),
  ])
  return {
    purchase: purchase ?? null,
    subscription: subscription ?? null,
    trial: trial ?? null,
    runningChallenge: runningChallenge ?? null,
  }
}

export async function resolveAppAccess(userId: string): Promise<{
  reason: AppAccessReason
  plan: CurrentPlan
  subscription: typeof userSubscription.$inferSelect | null
  trial: typeof lifetimeTrial.$inferSelect | null
}> {
  const now = new Date()
  let rows = await loadAccessRows(userId)

  // Opening the app is when an ended lifetime trial is charged its $9.99 (the cron is a backstop).
  if (!rows.purchase && lifetimeTrialChargeDue(rows.trial, now)) {
    try {
      await chargeLifetimeTrialIfDue(userId, now)
    } catch (error) {
      console.error('[access] lifetime trial charge failed:', error)
    }
    rows = await loadAccessRows(userId)
  }

  const reason = appAccessReason(
    {
      hasLifetime: !!rows.purchase,
      subscription: rows.subscription,
      lifetimeTrial: rows.trial,
      hasRunningChallenge: !!rows.runningChallenge,
      // Only asked when it matters: users with a plan never see the paywall either way.
      paywallEnabled:
        rows.purchase ||
        lifetimeTrialGrantsAccess(rows.trial, now) ||
        subscriptionGrantsAccess(rows.subscription, now)
          ? true
          : await isPaywallEnabled(userId),
    },
    now,
  )
  const plan: CurrentPlan = rows.purchase
    ? 'lifetime'
    : lifetimeTrialGrantsAccess(rows.trial, now)
      ? 'lifetime_trial'
      : subscriptionGrantsAccess(rows.subscription, now)
        ? 'weekly'
        : null
  return { reason, plan, subscription: rows.subscription, trial: rows.trial }
}

export async function getAppAccessImpl(): Promise<AppAccess> {
  const session = await ensureSession()
  const { reason, plan, subscription, trial } = await resolveAppAccess(session.user.id)
  const now = Date.now()
  return {
    hasAccess: reason !== 'none',
    reason,
    plan,
    trialAvailable: trialDaysForCheckout(hasUsedTrial(subscription, trial)) > 0,
    recentCheckoutFailed:
      plan === null &&
      subscription?.status === 'failed' &&
      now - subscription.updatedAt.getTime() < RECENT_FAILURE_MS,
    trialEndsAt:
      (plan === 'lifetime_trial' ? trial?.trialEndsAt : subscription?.trialEndsAt)?.toISOString() ??
      null,
    endsAt: subscription?.endsAt?.toISOString() ?? null,
    lifetimeChargeFailed: !!trial && trial.status === 'failed' && plan !== 'lifetime',
  }
}

export async function startAccessCheckoutImpl(plan: AccessPlan) {
  const session = await ensureSession()
  const sessionUser = session.user as SessionUser
  const now = new Date()

  const rows = await loadAccessRows(sessionUser.id)
  if (rows.purchase) throw new Error('You already have lifetime access.')
  if (plan === 'lifetime' && lifetimeTrialGrantsAccess(rows.trial, now)) {
    throw new Error('Your lifetime trial is already active.')
  }
  // Upgrading from weekly to lifetime is allowed; the webhook cancels the weekly plan.
  if (plan === 'weekly' && subscriptionGrantsAccess(rows.subscription, now)) {
    throw new Error('Your weekly subscription is already active.')
  }

  const trialDays = trialDaysForCheckout(hasUsedTrial(rows.subscription, rows.trial))
  try {
    const dodoCustomerId = await ensureDodoCustomer(sessionUser)
    const checkout =
      plan === 'weekly'
        ? await createWeeklyCheckout({ userId: sessionUser.id, dodoCustomerId, trialDays })
        : trialDays > 0
          ? await createLifetimeTrialCheckout({ userId: sessionUser.id, dodoCustomerId })
          : await createLifetimeCheckout({ userId: sessionUser.id, dodoCustomerId })
    return { checkoutUrl: checkout.checkoutUrl }
  } catch (error) {
    console.error(`[access] could not start ${plan} checkout:`, error)
    throw new Error('The payment page could not be opened. Try again in a moment.')
  }
}
