import { describe, expect, it } from 'vitest'
import {
  computeDayWindows,
  derivePendingStatus,
  isValidTimeZone,
  resolveStartDayOffset,
} from './windows'

// America/New_York is EST (UTC-5) through November 2026; DST starts 2026-03-08 and ends 2026-11-01.
const TZ = 'America/New_York'

describe('day windows', () => {
  it('anchors day 1 to the activation calendar day when starting today', () => {
    const windows = computeDayWindows({
      activatedAtUtc: new Date('2026-11-19T09:00:00Z'),
      timezone: TZ,
      startDayOffset: 0,
      totalDays: 2,
    })
    expect(windows[0]).toMatchObject({ dayNumber: 1, localDate: '2026-11-19' })
    expect(windows[0].windowStartUtc.toISOString()).toBe('2026-11-19T09:00:00.000Z')
    expect(windows[0].windowEndUtc.toISOString()).toBe('2026-11-20T05:00:00.000Z')
    expect(windows[1].windowStartUtc.toISOString()).toBe('2026-11-20T05:00:00.000Z')
    expect(windows[1].windowEndUtc.toISOString()).toBe('2026-11-21T05:00:00.000Z')
  })

  it('starts day 1 on the next local day when the user chooses tomorrow', () => {
    const windows = computeDayWindows({
      activatedAtUtc: new Date('2026-11-19T23:30:00Z'),
      timezone: TZ,
      startDayOffset: 1,
      totalDays: 2,
    })
    expect(windows[0].localDate).toBe('2026-11-20')
    expect(windows[0].windowStartUtc.toISOString()).toBe('2026-11-20T05:00:00.000Z')
    expect(windows[0].windowEndUtc.toISOString()).toBe('2026-11-21T05:00:00.000Z')
    expect(windows[1].localDate).toBe('2026-11-21')
  })

  it('handles the DST spring-forward day as a 23-hour window', () => {
    const windows = computeDayWindows({
      activatedAtUtc: new Date('2026-03-08T05:00:00Z'), // midnight EST on the spring-forward day
      timezone: TZ,
      startDayOffset: 0,
      totalDays: 1,
    })
    const hours =
      (windows[0].windowEndUtc.getTime() - windows[0].windowStartUtc.getTime()) / 3_600_000
    expect(hours).toBe(23)
  })

  it('handles the DST fall-back day as a 25-hour window', () => {
    const windows = computeDayWindows({
      activatedAtUtc: new Date('2026-11-01T04:00:00Z'), // midnight EDT on the fall-back day
      timezone: TZ,
      startDayOffset: 0,
      totalDays: 1,
    })
    const hours =
      (windows[0].windowEndUtc.getTime() - windows[0].windowStartUtc.getTime()) / 3_600_000
    expect(hours).toBe(25)
  })

  it('derives locked / pending / forfeited from the current time', () => {
    const window = computeDayWindows({
      activatedAtUtc: new Date('2026-11-19T09:00:00Z'),
      timezone: TZ,
      startDayOffset: 0,
      totalDays: 1,
    })[0]
    expect(derivePendingStatus(window, new Date('2026-11-19T08:00:00Z'))).toBe('locked')
    expect(derivePendingStatus(window, new Date('2026-11-19T10:00:00Z'))).toBe('pending')
    expect(derivePendingStatus(window, new Date('2026-11-20T06:00:00Z'))).toBe('forfeited')
  })
})

describe('timezone and start-day resolution', () => {
  it('accepts IANA timezones and rejects junk', () => {
    expect(isValidTimeZone(TZ)).toBe(true)
    expect(isValidTimeZone('UTC')).toBe(true)
    expect(isValidTimeZone('Mars/Olympus_Mons')).toBe(false)
    expect(isValidTimeZone('')).toBe(false)
  })

  it('keeps Today when the payment lands on the setup date before 20:00 local', () => {
    expect(
      resolveStartDayOffset({
        chosenOffset: 0,
        setupAtUtc: new Date('2026-11-19T09:00:00Z'), // 04:00 EST
        activatedAtUtc: new Date('2026-11-19T10:00:00Z'), // 05:00 EST
        timezone: TZ,
      }),
    ).toEqual({ startDayOffset: 0, clamped: false, reason: 'chosen' })
  })

  it('moves Day 1 to tomorrow if payment lands on a later local date', () => {
    expect(
      resolveStartDayOffset({
        chosenOffset: 0,
        setupAtUtc: new Date('2026-11-19T23:30:00Z'), // 18:30 EST
        activatedAtUtc: new Date('2026-11-20T05:30:00Z'), // 00:30 EST next day
        timezone: TZ,
      }),
    ).toEqual({ startDayOffset: 1, clamped: true, reason: 'date-changed' })
  })

  it('moves Day 1 to tomorrow when payment lands at or after 20:00 local', () => {
    expect(
      resolveStartDayOffset({
        chosenOffset: 0,
        setupAtUtc: new Date('2026-11-19T09:00:00Z'),
        activatedAtUtc: new Date('2026-11-20T02:00:00Z'), // 21:00 EST
        timezone: TZ,
      }),
    ).toEqual({ startDayOffset: 1, clamped: true, reason: 'late' })
  })

  it('never overrides an explicit tomorrow choice', () => {
    expect(
      resolveStartDayOffset({
        chosenOffset: 1,
        setupAtUtc: new Date('2026-11-19T09:00:00Z'),
        activatedAtUtc: new Date('2026-11-20T02:00:00Z'),
        timezone: TZ,
      }),
    ).toEqual({ startDayOffset: 1, clamped: false, reason: 'chosen' })
  })
})
