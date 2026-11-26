import { describe, expect, it } from 'vitest'
import { canCompleteDay, isChallengeFullyResolved } from './state'
import { computeDayWindows } from './windows'

const window = computeDayWindows({
  activatedAtUtc: new Date('2026-11-19T09:00:00Z'),
  timezone: 'America/New_York',
  startDayOffset: 0,
  totalDays: 1,
})[0]

describe('rep/set day completion rules', () => {
  it('allows completing an open day within its window', () => {
    expect(canCompleteDay('pending', window, new Date('2026-11-19T10:00:00Z'))).toEqual({ ok: true })
  })

  it('refuses to complete the same day twice', () => {
    expect(canCompleteDay('completed', window, new Date('2026-11-19T10:00:00Z'))).toEqual({
      ok: false,
      reason: 'already-completed',
    })
  })

  it('refuses a locked future day', () => {
    expect(canCompleteDay('locked', window, new Date('2026-11-19T08:00:00Z'))).toEqual({
      ok: false,
      reason: 'locked',
    })
  })

  it('refuses a day whose window has closed (forfeited)', () => {
    expect(canCompleteDay('pending', window, new Date('2026-11-20T06:00:00Z'))).toEqual({
      ok: false,
      reason: 'window-closed',
    })
  })
})

describe('challenge resolution', () => {
  it('is resolved when every day is terminal', () => {
    expect(
      isChallengeFullyResolved([window], ['completed'], new Date('2026-11-19T10:00:00Z')),
    ).toBe(true)
    expect(
      isChallengeFullyResolved([window], ['forfeited'], new Date('2026-11-20T06:00:00Z')),
    ).toBe(true)
  })

  it('is not resolved while a day is still pending', () => {
    expect(
      isChallengeFullyResolved([window], ['pending'], new Date('2026-11-19T10:00:00Z')),
    ).toBe(false)
  })

  it('becomes resolved once a pending day lapses past its deadline (forfeiture rule)', () => {
    expect(
      isChallengeFullyResolved([window], ['pending'], new Date('2026-11-20T06:00:00Z')),
    ).toBe(true)
  })
})
