import type { ChallengeConfig } from './types'

export function totalCommitmentAmount(
  config: Pick<ChallengeConfig, 'dailyStakeAmount' | 'totalDays'>,
): number {
  return config.dailyStakeAmount * config.totalDays
}

export type LedgerTotals = {
  totalCommitment: number
  dailyStake: number
  totalDays: number
  completedDays: number
  forfeitedDays: number
  remainingDays: number
  wonBackBalance: number
  forfeitedBalance: number
  remainingAmount: number
}

export function computeTotals(
  plan: { dailyStakeAmount: number; totalDays: number; totalCommitmentAmount: number },
  counts: { completed: number; forfeited: number },
): LedgerTotals {
  const { dailyStakeAmount: dailyStake, totalDays } = plan
  const completed = counts.completed
  const forfeited = counts.forfeited
  const remaining = Math.max(0, totalDays - completed - forfeited)

  return {
    totalCommitment: plan.totalCommitmentAmount,
    dailyStake,
    totalDays,
    completedDays: completed,
    forfeitedDays: forfeited,
    remainingDays: remaining,
    wonBackBalance: completed * dailyStake,
    forfeitedBalance: forfeited * dailyStake,
    remainingAmount: remaining * dailyStake,
  }
}

// The two invariants the ledger must always satisfy:
//   money:   wonBack + forfeited + remaining == totalCommitment
//   days:    completed + forfeited + remaining == totalDays
export function invariantHolds(totals: LedgerTotals): boolean {
  const moneyBalanced =
    totals.wonBackBalance + totals.forfeitedBalance + totals.remainingAmount ===
    totals.totalCommitment
  const daysBalanced =
    totals.completedDays + totals.forfeitedDays + totals.remainingDays === totals.totalDays
  return moneyBalanced && daysBalanced
}
