import type { ChallengeStatus, DayStatus, SettlementStatus } from './types'
import type { DayWindow } from './windows'
import { currentDayStatus } from './windows'

export type SettlementDecision =
  | { action: 'refund'; amountUnits: number; wonBackBalance: number }
  | { action: 'close'; amountUnits: 0; wonBackBalance: 0 }
  | { action: 'wait' }

// Decide what to do at settlement time. Only runs once every day is resolved.
export function decideSettlement(args: {
  windows: DayWindow[]
  storedStatuses: DayStatus[]
  dailyStakeAmount: number
  nowUtc: Date
  expectedDayCount?: number
}): SettlementDecision {
  // Never decide on an incomplete ledger. A challenge that activated without its day rows
  // must stay open for repair instead of being closed as a zero-refund challenge.
  if (args.windows.length === 0) return { action: 'wait' }
  if (args.expectedDayCount !== undefined && args.windows.length !== args.expectedDayCount) {
    return { action: 'wait' }
  }
  if (args.storedStatuses.length !== args.windows.length) return { action: 'wait' }

  const resolved = args.windows.every((window, index) => {
    const status = currentDayStatus(args.storedStatuses[index] ?? 'locked', window, args.nowUtc)
    return status === 'completed' || status === 'forfeited'
  })
  if (!resolved) return { action: 'wait' }

  const completed = args.storedStatuses.filter((status) => status === 'completed').length
  const wonBackBalance = completed * args.dailyStakeAmount
  if (wonBackBalance <= 0) return { action: 'close', amountUnits: 0, wonBackBalance: 0 }
  return { action: 'refund', amountUnits: wonBackBalance * 100, wonBackBalance }
}

export function shouldCreateRefund(settlementStatus: SettlementStatus): boolean {
  return settlementStatus === 'pending'
}

export function nextSettlementStatus(
  current: SettlementStatus,
  refundSucceeded: boolean,
): SettlementStatus {
  if (current === 'pending') return refundSucceeded ? 'settled' : 'pending'
  return current
}

// Pure model of the at-most-once refund lock. The server layer implements the same
// transition as an atomic SQL UPDATE ... WHERE status='active' AND settlementStatus='pending'.
export type LockState = {
  challengeStatus: ChallengeStatus
  settlementStatus: SettlementStatus
  refundId: string | null
}

export type AcquireResult = { acquired: true; next: LockState } | { acquired: false }

export function tryAcquireSettlementLock(state: LockState): AcquireResult {
  if (state.challengeStatus === 'active' && state.settlementStatus === 'pending') {
    return { acquired: true, next: { ...state, challengeStatus: 'settling' } }
  }
  return { acquired: false }
}

export function recordRefundInitiated(state: LockState, refundId: string): LockState {
  return { ...state, refundId }
}

export function recordRefundSucceeded(state: LockState): LockState {
  return { ...state, challengeStatus: 'settled', settlementStatus: 'settled' }
}

// No refund issued because the user won nothing back.
export function recordNoRefund(state: LockState): LockState {
  return { ...state, challengeStatus: 'settled', settlementStatus: 'none' }
}
