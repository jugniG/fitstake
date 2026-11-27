import { describe, expect, it } from 'vitest'
import {
  MAX_CHARGE_ATTEMPTS,
  chargeDescription,
  dueChargeDays,
  isHardDecline,
  isStaleClaim,
  nextAttemptAt,
  stakeIdempotencyKey,
} from './charges'

const first = new Date('2026-11-01T13:10:00Z')
const daysAfter = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000)

describe('dueChargeDays', () => {
  const now = new Date('2026-11-10T12:00:00Z')

  it('charges only forfeited days with no charge row, oldest first', () => {
    const due = dueChargeDays(
      [
        { dayNumber: 3, status: 'forfeited' },
        { dayNumber: 1, status: 'forfeited' },
        { dayNumber: 2, status: 'completed' },
        { dayNumber: 4, status: 'pending' },
        { dayNumber: 5, status: 'locked' },
      ],
      [],
      now,
    )
    expect(due).toEqual([1, 3])
  })

  it('never charges a day twice', () => {
    const due = dueChargeDays(
      [{ dayNumber: 1, status: 'forfeited' }],
      [{ dayNumber: 1, status: 'succeeded', nextAttemptAt: null }],
      now,
    )
    expect(due).toEqual([])
  })

  it('retries a failed charge only once its retry time has come', () => {
    const days = [{ dayNumber: 1, status: 'forfeited' as const }]
    const notYet = [{ dayNumber: 1, status: 'failed' as const, nextAttemptAt: daysAfter(now, 1) }]
    const ready = [{ dayNumber: 1, status: 'failed' as const, nextAttemptAt: daysAfter(now, -1) }]
    expect(dueChargeDays(days, notYet, now)).toEqual([])
    expect(dueChargeDays(days, ready, now)).toEqual([1])
  })

  it('never retries an abandoned or pending charge', () => {
    const days = [
      { dayNumber: 1, status: 'forfeited' as const },
      { dayNumber: 2, status: 'forfeited' as const },
    ]
    const charges = [
      { dayNumber: 1, status: 'abandoned' as const, nextAttemptAt: null },
      { dayNumber: 2, status: 'pending' as const, nextAttemptAt: null },
    ]
    expect(dueChargeDays(days, charges, now)).toEqual([])
  })

  it('leaves claimed rows to the in-flight recovery path', () => {
    const due = dueChargeDays(
      [{ dayNumber: 1, status: 'forfeited' }],
      [{ dayNumber: 1, status: 'claimed', nextAttemptAt: null }],
      now,
    )
    expect(due).toEqual([])
  })
})

describe('claims', () => {
  const now = new Date('2026-11-10T12:00:00Z')

  it('treats a recent claim as in flight and an old one as crashed', () => {
    expect(isStaleClaim(new Date(now.getTime() - 60_000), now)).toBe(false)
    expect(isStaleClaim(new Date(now.getTime() - 11 * 60_000), now)).toBe(true)
    expect(isStaleClaim(null, now)).toBe(true)
  })

  it('describes every day in one charge, in order', () => {
    expect(
      chargeDescription([
        { dayNumber: 4, localDate: '2026-11-04' },
        { dayNumber: 2, localDate: '2026-11-02' },
      ]),
    ).toBe('StakeFit: missed Day 2 (2026-11-02), Day 4 (2026-11-04)')
  })
})

describe('retry schedule', () => {
  it('retries at +3, +10 and +17 days at the same time of day', () => {
    expect(nextAttemptAt(first, 1, null)).toEqual(daysAfter(first, 3))
    expect(nextAttemptAt(first, 2, null)).toEqual(daysAfter(first, 10))
    expect(nextAttemptAt(first, 3, null)).toEqual(daysAfter(first, 17))
  })

  it(`stops after ${MAX_CHARGE_ATTEMPTS} attempts`, () => {
    expect(nextAttemptAt(first, MAX_CHARGE_ATTEMPTS, null)).toBeNull()
  })

  it('never retries a hard decline', () => {
    expect(isHardDecline('STOLEN_CARD')).toBe(true)
    expect(isHardDecline('fraudulent')).toBe(true)
    expect(isHardDecline('INSUFFICIENT_FUNDS')).toBe(false)
    expect(isHardDecline(null)).toBe(false)
    expect(nextAttemptAt(first, 1, 'STOLEN_CARD')).toBeNull()
  })
})

describe('stakeIdempotencyKey', () => {
  it('is stable per claim', () => {
    expect(stakeIdempotencyKey('claim_1')).toBe('stake:claim_1')
    expect(stakeIdempotencyKey('claim_2')).not.toBe(stakeIdempotencyKey('claim_1'))
  })
})
