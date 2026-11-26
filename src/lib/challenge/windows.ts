import { addDays, format, parseISO } from 'date-fns'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import type { DayStatus } from './types'

export type DayWindow = {
  dayNumber: number
  localDate: string // yyyy-MM-dd in the pinned timezone
  windowStartUtc: Date
  windowEndUtc: Date // deadline
}

export type ComputeWindowsInput = {
  activatedAtUtc: Date
  timezone: string
  startDayOffset: 0 | 1 // 0 = Day 1 starts Today; 1 = Day 1 starts Tomorrow
  totalDays: number
}

export const LATE_START_HOUR = 20

export function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
    return true
  } catch {
    return false
  }
}

export type StartDayResolution = {
  startDayOffset: 0 | 1
  clamped: boolean
  reason: 'chosen' | 'date-changed' | 'late'
}

// The start day is chosen before checkout, but the webhook is the first instant the server
// knows the payment is real. Re-resolve it there so a checkout that lands on the next local
// date (or late at night) never produces a Day 1 window that is already over.
export function resolveStartDayOffset(input: {
  chosenOffset: 0 | 1
  setupAtUtc: Date
  activatedAtUtc: Date
  timezone: string
}): StartDayResolution {
  if (!isValidTimeZone(input.timezone)) {
    throw new Error(`Invalid timezone: ${input.timezone}`)
  }
  if (input.chosenOffset === 1) {
    return { startDayOffset: 1, clamped: false, reason: 'chosen' }
  }

  const setupDate = formatInTimeZone(input.setupAtUtc, input.timezone, 'yyyy-MM-dd')
  const activationDate = formatInTimeZone(input.activatedAtUtc, input.timezone, 'yyyy-MM-dd')
  if (setupDate !== activationDate) {
    return { startDayOffset: 1, clamped: true, reason: 'date-changed' }
  }

  const activationHour = Number(formatInTimeZone(input.activatedAtUtc, input.timezone, 'H'))
  if (activationHour >= LATE_START_HOUR) {
    return { startDayOffset: 1, clamped: true, reason: 'late' }
  }

  return { startDayOffset: 0, clamped: false, reason: 'chosen' }
}

// Compute every day's window from the pinned timezone + the user's Today/Tomorrow choice.
// Each day's boundaries are derived from its own local calendar date (not by adding 24h),
// which keeps DST transitions correct.
export function computeDayWindows(input: ComputeWindowsInput): DayWindow[] {
  const { activatedAtUtc, timezone, startDayOffset, totalDays } = input
  const activationLocalDateStr = formatInTimeZone(activatedAtUtc, timezone, 'yyyy-MM-dd')
  const day1Local = addDays(parseISO(activationLocalDateStr), startDayOffset)
  const windows: DayWindow[] = []

  for (let dayNumber = 1; dayNumber <= totalDays; dayNumber += 1) {
    const localDate = addDays(day1Local, dayNumber - 1)
    const localDateStr = format(localDate, 'yyyy-MM-dd')
    const startOfThisDayUtc = fromZonedTime(`${localDateStr}T00:00:00`, timezone)
    const startOfNextDayUtc = fromZonedTime(`${format(addDays(localDate, 1), 'yyyy-MM-dd')}T00:00:00`, timezone)
    // Day 1 starting "today" runs from the activation instant; every other window starts at local midnight.
    const windowStartUtc =
      dayNumber === 1 && startDayOffset === 0 ? activatedAtUtc : startOfThisDayUtc
    windows.push({ dayNumber, localDate: localDateStr, windowStartUtc, windowEndUtc: startOfNextDayUtc })
  }

  return windows
}

// The status a non-terminal day should have right now (ignoring any stored completed/forfeited).
export function derivePendingStatus(window: DayWindow, nowUtc: Date): DayStatus {
  if (nowUtc < window.windowStartUtc) return 'locked'
  if (nowUtc < window.windowEndUtc) return 'pending'
  return 'forfeited'
}

// Authoritative current status: a stored terminal state wins; otherwise derive from the window.
export function currentDayStatus(stored: DayStatus, window: DayWindow, nowUtc: Date): DayStatus {
  if (stored === 'completed' || stored === 'forfeited') return stored
  return derivePendingStatus(window, nowUtc)
}
