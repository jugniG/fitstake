import type { StakeChargeStatus } from './types'

// The most a challenge can ever cost: every day missed.
export function maxExposure(plan: { dailyStakeAmount: number; totalDays: number }): number {
  return plan.dailyStakeAmount * plan.totalDays
}

// The statement shown before the card mandate and stored with the challenge. The server builds
// it from the validated amounts, so the stored text always matches what is charged.
export function consentStatement(plan: { dailyStakeAmount: number; totalDays: number }): string {
  const stake = `$${plan.dailyStakeAmount}`
  const max = `$${maxExposure(plan)}`
  const days = plan.totalDays === 1 ? '1 day' : `${plan.totalDays} days`
  return (
    `I authorize StakeFit to charge my card ${stake} for each day I miss my workout, ` +
    `up to ${max} over ${days}. Days I complete on camera cost nothing. ` +
    `Missed days are charged the next time I open the app, or within a day.`
  )
}

export type LedgerTotals = {
  dailyStake: number
  totalDays: number
  completedDays: number
  missedDays: number
  remainingDays: number
  maxExposure: number
  // Dollars actually collected for missed days.
  chargedAmount: number
  // Dollars for missed days whose charge has not succeeded yet (pending, failed, abandoned).
  owedAmount: number
  // The most the user can still lose on the days that are left.
  remainingExposure: number
}

export function computeTotals(
  plan: { dailyStakeAmount: number; totalDays: number },
  counts: { completed: number; missed: number },
  charges: Array<{ status: StakeChargeStatus }>,
): LedgerTotals {
  const { dailyStakeAmount: dailyStake, totalDays } = plan
  const remainingDays = Math.max(0, totalDays - counts.completed - counts.missed)
  const succeeded = charges.filter((charge) => charge.status === 'succeeded').length

  return {
    dailyStake,
    totalDays,
    completedDays: counts.completed,
    missedDays: counts.missed,
    remainingDays,
    maxExposure: maxExposure(plan),
    chargedAmount: succeeded * dailyStake,
    owedAmount: Math.max(0, counts.missed - succeeded) * dailyStake,
    remainingExposure: remainingDays * dailyStake,
  }
}

// Ledger invariants:
//   days:   completed + missed + remaining == totalDays
//   money:  charged + owed == missed × stake, and never more than the max exposure
export function invariantHolds(totals: LedgerTotals): boolean {
  const daysBalanced =
    totals.completedDays + totals.missedDays + totals.remainingDays === totals.totalDays
  const missedBalanced =
    totals.chargedAmount + totals.owedAmount === totals.missedDays * totals.dailyStake
  const withinExposure = totals.chargedAmount + totals.owedAmount <= totals.maxExposure
  return daysBalanced && missedBalanced && withinExposure
}
