import { describe, expect, it } from 'vitest'
import { computeTotals, invariantHolds, maxExposure } from './math'

describe('challenge math', () => {
  it('computes the maximum exposure from the daily stake and duration', () => {
    expect(maxExposure({ dailyStakeAmount: 10, totalDays: 30 })).toBe(300)
    expect(maxExposure({ dailyStakeAmount: 1, totalDays: 1 })).toBe(1)
  })

  it('splits missed days into charged and owed amounts', () => {
    const totals = computeTotals(
      { dailyStakeAmount: 10, totalDays: 30 },
      { completed: 20, missed: 5 },
      [
        { status: 'succeeded' },
        { status: 'succeeded' },
        { status: 'succeeded' },
        { status: 'failed' },
        { status: 'pending' },
      ],
    )
    expect(totals).toMatchObject({
      completedDays: 20,
      missedDays: 5,
      remainingDays: 5,
      chargedAmount: 30,
      owedAmount: 20,
      remainingExposure: 50,
      maxExposure: 300,
    })
    expect(invariantHolds(totals)).toBe(true)
  })

  it('counts a missed day with no charge row yet as owed', () => {
    const totals = computeTotals(
      { dailyStakeAmount: 10, totalDays: 3 },
      { completed: 1, missed: 1 },
      [],
    )
    expect(totals.owedAmount).toBe(10)
    expect(totals.chargedAmount).toBe(0)
  })

  it('flags a broken invariant', () => {
    const totals = computeTotals(
      { dailyStakeAmount: 10, totalDays: 30 },
      { completed: 20, missed: 5 },
      [],
    )
    expect(invariantHolds({ ...totals, chargedAmount: 999 })).toBe(false)
  })
})
