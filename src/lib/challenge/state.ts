import type { DayStatus } from './types'
import type { DayWindow } from './windows'
import { currentDayStatus, derivePendingStatus } from './windows'

export type CompleteDayResult =
  | { ok: true }
  | { ok: false; reason: 'locked' | 'not-open' | 'already-completed' | 'window-closed' }

// May a workout completion be accepted for this day right now?
export function canCompleteDay(
  stored: DayStatus,
  window: DayWindow,
  nowUtc: Date,
): CompleteDayResult {
  if (stored === 'completed') return { ok: false, reason: 'already-completed' }
  if (stored === 'forfeited') return { ok: false, reason: 'window-closed' }

  const derived = derivePendingStatus(window, nowUtc)
  if (derived === 'locked') return { ok: false, reason: 'locked' }
  if (derived === 'forfeited') return { ok: false, reason: 'window-closed' }
  return { ok: true }
}

// Is every day in a terminal state (completed or forfeited, or lapsed past its deadline)?
export function isChallengeFullyResolved(
  windows: DayWindow[],
  storedStatuses: DayStatus[],
  nowUtc: Date,
): boolean {
  return windows.every((window, index) => {
    const status = currentDayStatus(storedStatuses[index] ?? 'locked', window, nowUtc)
    return status === 'completed' || status === 'forfeited'
  })
}
