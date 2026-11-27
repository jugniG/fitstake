import { APIError } from 'dodopayments'
import { assertDodoConfigured, dodo } from './client'
import { CHECKOUT_KIND } from './checkout'

export type ChargeAttemptResult =
  | { outcome: 'submitted'; paymentId: string }
  // A previous payment on this mandate is still processing; try again on the next run.
  | { outcome: 'busy' }
  // Dodo refuses further charges after too many failures since the last success.
  | { outcome: 'blocked'; message: string }
  | { outcome: 'error'; message: string }

// Charges a custom amount against an on-demand mandate. The idempotency key makes re-sending
// the same claim return the original payment instead of creating a second charge.
async function chargeMandate(args: {
  subscriptionId: string
  amountCents: number
  description: string
  metadata: Record<string, string>
  idempotencyKey: string
}): Promise<ChargeAttemptResult> {
  assertDodoConfigured()
  try {
    const response = await dodo.subscriptions.charge(
      args.subscriptionId,
      {
        product_price: args.amountCents,
        product_currency: 'USD',
        product_description: args.description,
        metadata: args.metadata,
      },
      { idempotencyKey: args.idempotencyKey },
    )
    return { outcome: 'submitted', paymentId: response.payment_id }
  } catch (error) {
    if (error instanceof APIError) {
      if (error.status === 409) return { outcome: 'busy' }
      if (error.status === 429) return { outcome: 'blocked', message: error.message }
      return { outcome: 'error', message: `${error.status ?? ''} ${error.message}`.trim() }
    }
    return { outcome: 'error', message: (error as Error).message }
  }
}

// One claim of missed days against a challenge's stake mandate.
export function chargeMissedDays(args: {
  subscriptionId: string
  amountCents: number
  description: string
  challengeId: string
  claimId: string
  dayNumbers: number[]
  idempotencyKey: string
}): Promise<ChargeAttemptResult> {
  return chargeMandate({
    subscriptionId: args.subscriptionId,
    amountCents: args.amountCents,
    description: args.description,
    idempotencyKey: args.idempotencyKey,
    metadata: {
      kind: CHECKOUT_KIND.stakeCharge,
      challengeId: args.challengeId,
      claimId: args.claimId,
      days: args.dayNumbers.join(','),
    },
  })
}

// The one-time lifetime price, charged when the lifetime trial ends.
export function chargeLifetimeAfterTrial(args: {
  subscriptionId: string
  amountCents: number
  userId: string
  trialId: string
}): Promise<ChargeAttemptResult> {
  return chargeMandate({
    subscriptionId: args.subscriptionId,
    amountCents: args.amountCents,
    description: 'StakeFit lifetime access',
    idempotencyKey: `lifetime:${args.trialId}`,
    metadata: {
      kind: CHECKOUT_KIND.lifetimeTrialCharge,
      userId: args.userId,
      trialId: args.trialId,
    },
  })
}

// Ends a mandate right away so no further charges are possible.
export async function cancelSubscriptionNow(subscriptionId: string): Promise<void> {
  assertDodoConfigured()
  await dodo.subscriptions.update(subscriptionId, { status: 'cancelled' })
}

// Hosted page where the user adds a new card to a mandate after a declined charge.
export async function createUpdateCardLink(args: {
  subscriptionId: string
  returnUrl: string
}): Promise<string> {
  assertDodoConfigured()
  const response = await dodo.subscriptions.updatePaymentMethod(args.subscriptionId, {
    payment_method: { type: 'new', return_url: args.returnUrl },
  })
  if (!response.payment_link) throw new Error('Dodo returned no card update link')
  return response.payment_link
}
