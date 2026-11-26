import { describe, expect, it } from 'vitest'
import { computeTotals, invariantHolds, totalCommitmentAmount } from './math'

describe('challenge math', () => {
  it('computes the total commitment from the daily stake and duration', () => {
    expect(totalCommitmentAmount({ dailyStakeAmount: 10, totalDays: 30 })).toBe(300)
    expect(totalCommitmentAmount({ dailyStakeAmount: 1, totalDays: 1 })).toBe(1)
    expect(totalCommitmentAmount({ dailyStakeAmount: 25, totalDays: 14 })).toBe(350)
  })

  it('reconciles won-back, forfeited and remaining totals', () => {
    const totals = computeTotals(
      { dailyStakeAmount: 10, totalDays: 30, totalCommitmentAmount: 300 },
      { completed: 20, forfeited: 5 },
    )
    expect(totals).toMatchObject({
      wonBackBalance: 200,
      forfeitedBalance: 50,
      remainingAmount: 50,
      remainingDays: 5,
      completedDays: 20,
      forfeitedDays: 5,
    })
    expect(invariantHolds(totals)).toBe(true)
  })

  it('flags a broken money invariant', () => {
    const tampered: ReturnType<typeof computeTotals> = {
      ...computeTotals(
        { dailyStakeAmount: 10, totalDays: 30, totalCommitmentAmount: 300 },
        { completed: 20, forfeited: 5 },
      ),
      remainingAmount: 999,
    }
    expect(invariantHolds(tampered)).toBe(false)
  })
})
