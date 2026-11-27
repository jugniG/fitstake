import { and, eq, inArray } from 'drizzle-orm'
import { db, challenge, lifetimeAccess, user, userSubscription } from '#/db.server'
import { ensureSession } from '#/lib/auth.functions'
import { createLifetimeCheckout, createSubscriptionCheckout } from '#/lib/kelviq/checkout'
import { ensureKelviqCustomer } from '#/lib/kelviq/customers'
import {
  appAccessReason,
  LIFETIME_PRICE_USD,
  subscriptionGrantsAccess,
  trialDaysForCheckout,
} from '#/lib/access'
import type { AppAccessReason } from '#/lib/access'
import type { AccessPlan, AppAccess } from './access'

type SessionUser = { id: string; email: string; name: string }

export async function resolveAppAccess(userId: string): Promise<{
  reason: AppAccessReason
  subscription: typeof userSubscription.$inferSelect | null
}> {
  const [purchase, subscription, runningChallenge] = await Promise.all([
    db.query.lifetimeAccess.findFirst({
      where: eq(lifetimeAccess.userId, userId),
      columns: { id: true },
    }),
    db.query.userSubscription.findFirst({ where: eq(userSubscription.userId, userId) }),
    db.query.challenge.findFirst({
      where: and(eq(challenge.userId, userId), inArray(challenge.status, ['active', 'settling'])),
      columns: { id: true },
    }),
  ])
  return {
    reason: appAccessReason(
      {
        hasLifetime: !!purchase,
        subscription: subscription ?? null,
        hasRunningChallenge: !!runningChallenge,
      },
      new Date(),
    ),
    subscription: subscription ?? null,
  }
}

export async function getAppAccessImpl(): Promise<AppAccess> {
  const session = await ensureSession()
  const { reason, subscription } = await resolveAppAccess(session.user.id)
  return {
    hasAccess: reason !== 'none',
    reason,
    trialAvailable: trialDaysForCheckout(!!subscription) > 0,
    trialEndsAt: subscription?.trialEndsAt?.toISOString() ?? null,
    endsAt: subscription?.endsAt?.toISOString() ?? null,
  }
}

async function prepareCustomer(sessionUser: SessionUser) {
  const customer = await ensureKelviqCustomer({
    userId: sessionUser.id,
    email: sessionUser.email,
    name: sessionUser.name,
  })
  await db.update(user).set({ kelviqCustomerId: customer.id }).where(eq(user.id, sessionUser.id))
  return customer
}

export async function startAccessCheckoutImpl(plan: AccessPlan) {
  const session = await ensureSession()
  const sessionUser = session.user as SessionUser

  const [purchase, subscription] = await Promise.all([
    db.query.lifetimeAccess.findFirst({
      where: eq(lifetimeAccess.userId, sessionUser.id),
      columns: { id: true },
    }),
    db.query.userSubscription.findFirst({ where: eq(userSubscription.userId, sessionUser.id) }),
  ])
  if (purchase) throw new Error('You already have lifetime access.')
  // Upgrading from weekly to lifetime is allowed; the webhook cancels the weekly plan.
  if (plan === 'weekly' && subscriptionGrantsAccess(subscription ?? null, new Date())) {
    throw new Error('Your weekly subscription is already active.')
  }

  try {
    const customer = await prepareCustomer(sessionUser)
    const checkout =
      plan === 'lifetime'
        ? await createLifetimeCheckout({
            userId: sessionUser.id,
            customerId: customer.customerId,
            amountDollars: LIFETIME_PRICE_USD,
          })
        : await createSubscriptionCheckout({
            userId: sessionUser.id,
            customerId: customer.customerId,
            trialDays: trialDaysForCheckout(!!subscription),
          })
    return { checkoutUrl: checkout.checkoutUrl }
  } catch (error) {
    console.error(`[access] could not start ${plan} checkout:`, error)
    throw new Error('The payment page could not be opened. Try again in a moment.')
  }
}
