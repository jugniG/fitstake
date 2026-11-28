import { env } from '../env'
import { assertDodoConfigured, dodo } from './client'

// `kind` in metadata routes each webhook to the right handler. Webhook handlers still match on
// the ids we stored (customer, subscription, payment) before trusting metadata.
export const CHECKOUT_KIND = {
  weekly: 'weekly',
  lifetime: 'lifetime',
  lifetimeTrial: 'lifetime_trial',
  lifetimeTrialCharge: 'lifetime_trial_charge',
  stakeMandate: 'stake_mandate',
  stakeCharge: 'stake_charge',
} as const

export type DodoCheckout = { checkoutUrl: string; sessionId: string }

function requireProductId(productId: string, envName: string): string {
  if (!productId) throw new Error(`${envName} is not set`)
  return productId
}

async function createSession(
  params: Parameters<typeof dodo.checkoutSessions.create>[0],
): Promise<DodoCheckout> {
  assertDodoConfigured()
  const session = await dodo.checkoutSessions.create(params)
  if (!session.checkout_url) throw new Error('Dodo returned no checkout URL')
  return { checkoutUrl: session.checkout_url, sessionId: session.session_id }
}

// $2/week plan. The product has no trial; first-time subscribers get one per session, so a
// returning subscriber can't restart a free trial.
export function createWeeklyCheckout(args: {
  userId: string
  dodoCustomerId: string
  trialDays: number
}): Promise<DodoCheckout> {
  return createSession({
    product_cart: [
      {
        product_id: requireProductId(env.DODO_WEEKLY_PRODUCT_ID, 'DODO_WEEKLY_PRODUCT_ID'),
        quantity: 1,
      },
    ],
    customer: { customer_id: args.dodoCustomerId },
    ...(args.trialDays > 0 ? { subscription_data: { trial_period_days: args.trialDays } } : {}),
    return_url: `${env.APP_URL}/paywall?checkout=return`,
    cancel_url: `${env.APP_URL}/paywall`,
    metadata: { kind: CHECKOUT_KIND.weekly, userId: args.userId },
  })
}

// $9.99 one-time lifetime access.
export function createLifetimeCheckout(args: {
  userId: string
  dodoCustomerId: string
}): Promise<DodoCheckout> {
  return createSession({
    product_cart: [
      {
        product_id: requireProductId(env.DODO_LIFETIME_PRODUCT_ID, 'DODO_LIFETIME_PRODUCT_ID'),
        quantity: 1,
      },
    ],
    customer: { customer_id: args.dodoCustomerId },
    return_url: `${env.APP_URL}/paywall?checkout=return`,
    cancel_url: `${env.APP_URL}/paywall`,
    metadata: { kind: CHECKOUT_KIND.lifetime, userId: args.userId },
  })
}

// Lifetime with a 3-day trial. Dodo one-time products can't have a trial, so the card is
// authorized as an on-demand mandate (nothing charged) and the app charges $9.99 when the trial
// ends.
export function createLifetimeTrialCheckout(args: {
  userId: string
  dodoCustomerId: string
}): Promise<DodoCheckout> {
  return createSession({
    product_cart: [
      {
        product_id: requireProductId(
          env.DODO_LIFETIME_TRIAL_PRODUCT_ID,
          'DODO_LIFETIME_TRIAL_PRODUCT_ID',
        ),
        quantity: 1,
      },
    ],
    customer: { customer_id: args.dodoCustomerId },
    subscription_data: { on_demand: { mandate_only: true } },
    return_url: `${env.APP_URL}/paywall?checkout=return`,
    cancel_url: `${env.APP_URL}/paywall`,
    metadata: { kind: CHECKOUT_KIND.lifetimeTrial, userId: args.userId },
  })
}

// Card mandate for one challenge. Nothing is charged now (`mandate_only`); missed days are
// charged later with subscriptions.charge.
export function createStakeMandateCheckout(args: {
  userId: string
  dodoCustomerId: string
  challengeId: string
}): Promise<DodoCheckout> {
  return createSession({
    product_cart: [
      {
        product_id: requireProductId(env.DODO_STAKE_PRODUCT_ID, 'DODO_STAKE_PRODUCT_ID'),
        quantity: 1,
      },
    ],
    customer: { customer_id: args.dodoCustomerId },
    subscription_data: { on_demand: { mandate_only: true } },
    return_url: `${env.APP_URL}/dashboard?mandate=return`,
    cancel_url: `${env.APP_URL}/setup`,
    metadata: {
      kind: CHECKOUT_KIND.stakeMandate,
      userId: args.userId,
      challengeId: args.challengeId,
    },
  })
}
