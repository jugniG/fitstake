import { CHARGE_PERIOD_CHOICES } from '@kelviq/node-sdk'
import { kelviq } from './client'
import { env } from '../env'

export type CommitmentCheckout = { checkoutUrl: string; checkoutSessionId: string }

// One-time Kelviq charge of the full commitment pot. challengeId/userId travel in metadata
// and come back on the checkout.completed webhook, so the webhook can activate the challenge.
export async function createCommitmentCheckout(args: {
  challengeId: string
  userId: string
  customerId: string
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
    metadata: { challengeId: args.challengeId, userId: args.userId },
  })
}
