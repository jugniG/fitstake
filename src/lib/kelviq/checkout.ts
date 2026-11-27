import { CHARGE_PERIOD_CHOICES } from '@kelviq/node-sdk'
import { kelviq } from './client'
import { env } from '../env'

export type CommitmentCheckout = { checkoutUrl: string; checkoutSessionId: string }

export const SUBSCRIPTION_CHECKOUT_KIND = 'app_subscription'
export const LIFETIME_CHECKOUT_KIND = 'lifetime_access'

// $49 one-time lifetime purchase. It must use its own plan, not the commitment plan, so the
// webhook never mistakes this order for a refundable pot. The amount is pinned here so a plan
// price edit in the dashboard cannot silently change what users are charged.
export async function createLifetimeCheckout(args: {
  userId: string
  customerId: string
  amountDollars: number
}): Promise<CommitmentCheckout> {
  if (!env.KELVIQ_LIFETIME_PLAN_IDENTIFIER) {
    throw new Error('KELVIQ_LIFETIME_PLAN_IDENTIFIER is not set')
  }

  return kelviq.checkout.createSession({
    planIdentifier: env.KELVIQ_LIFETIME_PLAN_IDENTIFIER,
    chargePeriod: CHARGE_PERIOD_CHOICES.ONE_TIME,
    customerId: args.customerId,
    customAmount: args.amountDollars,
    currencyCode: 'USD',
    taxBehavior: 'EXCLUSIVE',
    successUrl: `${env.APP_URL}/paywall?checkout=return`,
    metadata: { kind: LIFETIME_CHECKOUT_KIND, userId: args.userId },
  })
}

// $2/week app subscription; the price lives on the Kelviq plan. The trial is set per session
// so editing the plan cannot remove it. Kelviq collects and authorizes the card at signup and
// charges it when the trial ends.
export async function createSubscriptionCheckout(args: {
  userId: string
  customerId: string
  trialDays: number
}): Promise<CommitmentCheckout> {
  if (!env.KELVIQ_SUBSCRIPTION_PLAN_IDENTIFIER) {
    throw new Error('KELVIQ_SUBSCRIPTION_PLAN_IDENTIFIER is not set')
  }

  return kelviq.checkout.createSession({
    planIdentifier: env.KELVIQ_SUBSCRIPTION_PLAN_IDENTIFIER,
    chargePeriod: CHARGE_PERIOD_CHOICES.WEEKLY,
    ...(args.trialDays > 0 ? { trialPeriod: args.trialDays } : {}),
    customerId: args.customerId,
    successUrl: `${env.APP_URL}/paywall?checkout=return`,
    metadata: { kind: SUBSCRIPTION_CHECKOUT_KIND, userId: args.userId },
  })
}

// One-time Kelviq charge of the full commitment pot. challengeId/userId travel in metadata
// and come back on the checkout.completed webhook, so the webhook can activate the challenge.
export async function createCommitmentCheckout(args: {
  challengeId: string
  userId: string
  customerId: string
  userName?: string
  amountDollars: number
}): Promise<CommitmentCheckout> {
  if (!env.KELVIQ_COMMITMENT_PLAN_IDENTIFIER) {
    throw new Error('KELVIQ_COMMITMENT_PLAN_IDENTIFIER is not set')
  }

  return kelviq.checkout.createSession({
    planIdentifier: env.KELVIQ_COMMITMENT_PLAN_IDENTIFIER,
    chargePeriod: CHARGE_PERIOD_CHOICES.ONE_TIME,
    customerId: args.customerId,
    customAmount: args.amountDollars,
    currencyCode: 'USD',
    // The pot is the refundable base amount; any tax is calculated on top and shown at checkout.
    taxBehavior: 'EXCLUSIVE',
    successUrl: `${env.APP_URL}/dashboard?checkout=return`,
    metadata: {
      challengeId: args.challengeId,
      userId: args.userId,
      ...(args.userName ? { customerName: args.userName } : {}),
    },
  })
}
