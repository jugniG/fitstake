import { and, eq, inArray, isNull, lt, lte, or } from 'drizzle-orm'
import { db, lifetimeTrial } from '#/db.server'
import { LIFETIME_PRICE_CENTS, LIFETIME_PRICE_USD } from '#/lib/access'
import { isStaleClaim } from '#/lib/challenge'
import { chargeLifetimeAfterTrial } from '#/lib/dodo/charges'

export type LifetimeChargeResult = 'charged' | 'not_due' | 'deferred' | 'failed'

// Charges $9.99 for a lifetime trial whose 3 days are over. Called when the user opens the app and
// from the daily cron. The conditional UPDATE is the claim: only one caller moves a trial from
// `trialing` (or a crashed `charging`) to a fresh `charging`, and the idempotency key keeps a
// re-sent claim from charging twice.
export async function chargeLifetimeTrialIfDue(
  userId: string,
  now = new Date(),
): Promise<LifetimeChargeResult> {
  const staleBefore = new Date(now.getTime() - 10 * 60 * 1000)
  const claimed = await db
    .update(lifetimeTrial)
    .set({ status: 'charging', chargeClaimedAt: now })
    .where(
      and(
        eq(lifetimeTrial.userId, userId),
        lte(lifetimeTrial.trialEndsAt, now),
        or(
          eq(lifetimeTrial.status, 'trialing'),
          and(
            eq(lifetimeTrial.status, 'charging'),
            isNull(lifetimeTrial.dodoPaymentId),
            or(
              isNull(lifetimeTrial.chargeClaimedAt),
              lt(lifetimeTrial.chargeClaimedAt, staleBefore),
            ),
          ),
        ),
      ),
    )
    .returning()
  const trial = claimed.at(0)
  if (!trial) return 'not_due'

  const result = await chargeLifetimeAfterTrial({
    subscriptionId: trial.dodoSubscriptionId,
    amountCents: LIFETIME_PRICE_CENTS,
    userId,
    trialId: trial.id,
  })

  if (result.outcome === 'submitted') {
    // The payment.succeeded webhook grants lifetime access; until then access stays on.
    await db
      .update(lifetimeTrial)
      .set({ dodoPaymentId: result.paymentId })
      .where(and(eq(lifetimeTrial.id, trial.id), eq(lifetimeTrial.status, 'charging')))
    return 'charged'
  }
  // Still `charging` with no payment id: re-sent with the same key once the claim is stale.
  if (result.outcome === 'busy') return 'deferred'

  console.error(
    `[lifetime-trial] $${LIFETIME_PRICE_USD} charge for user ${userId} failed:`,
    result.message,
  )
  await db
    .update(lifetimeTrial)
    .set({ status: 'failed', failureMessage: result.message })
    .where(and(eq(lifetimeTrial.id, trial.id), eq(lifetimeTrial.status, 'charging')))
  return 'failed'
}

// Cron backstop for users who stop opening the app after their trial.
export async function chargeAllDueLifetimeTrials(now = new Date()): Promise<{
  processed: number
  errors: string[]
}> {
  const due = await db
    .select({ userId: lifetimeTrial.userId, claimedAt: lifetimeTrial.chargeClaimedAt })
    .from(lifetimeTrial)
    .where(
      and(
        inArray(lifetimeTrial.status, ['trialing', 'charging']),
        lte(lifetimeTrial.trialEndsAt, now),
        isNull(lifetimeTrial.dodoPaymentId),
      ),
    )

  const errors: string[] = []
  for (const row of due) {
    if (row.claimedAt && !isStaleClaim(row.claimedAt, now)) continue
    try {
      await chargeLifetimeTrialIfDue(row.userId, now)
    } catch (error) {
      console.error(`[lifetime-trial] cron charge failed for user ${row.userId}:`, error)
      errors.push(`user ${row.userId}: ${(error as Error).message}`)
    }
  }
  return { processed: due.length, errors }
}
