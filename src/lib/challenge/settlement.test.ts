import { describe, expect, it } from 'vitest'
import {
  decideSettlement,
  nextSettlementStatus,
  recordNoRefund,
  recordRefundInitiated,
  recordRefundSucceeded,
  shouldCreateRefund,
  tryAcquireSettlementLock,
} from './settlement'
import type { LockState } from './settlement'
import { computeDayWindows } from './windows'

const tz = 'America/New_York'
const window = computeDayWindows({
  activatedAtUtc: new Date('2026-11-19T09:00:00Z'),
  timezone: tz,
  startDayOffset: 0,
  totalDays: 1,
})[0]

describe('settlement decision', () => {
  it('waits until every day is resolved', () => {
    expect(
      decideSettlement({
        windows: [window],
        storedStatuses: ['pending'],
        dailyStakeAmount: 10,
        nowUtc: new Date('2026-11-19T10:00:00Z'),
      }).action,
    ).toBe('wait')
  })

  it('refunds the full won-back balance in minor units when a day was completed', () => {
    const decision = decideSettlement({
      windows: [window],
      storedStatuses: ['completed'],
      dailyStakeAmount: 10,
      nowUtc: new Date('2026-11-20T06:00:00Z'),
    })
    expect(decision.action).toBe('refund')
    if (decision.action === 'refund') expect(decision.amountUnits).toBe(1000) // 10 USD * 100
  })

  it('closes without a refund when nothing was won back (all forfeited)', () => {
    const decision = decideSettlement({
      windows: [window],
      storedStatuses: ['forfeited'],
      dailyStakeAmount: 10,
      nowUtc: new Date('2026-11-20T06:00:00Z'),
    })
    expect(decision.action).toBe('close')
  })

  it('never closes a challenge with no day rows', () => {
    expect(
      decideSettlement({
        windows: [],
        storedStatuses: [],
        dailyStakeAmount: 10,
        nowUtc: new Date('2026-11-20T06:00:00Z'),
        expectedDayCount: 1,
      }).action,
    ).toBe('wait')
  })

  it('waits when the ledger has fewer days than the challenge promised', () => {
    expect(
      decideSettlement({
        windows: [window],
        storedStatuses: ['completed'],
        dailyStakeAmount: 10,
        nowUtc: new Date('2026-11-20T06:00:00Z'),
        expectedDayCount: 3,
      }).action,
    ).toBe('wait')
  })
})

describe('idempotent single-refund settlement', () => {
  it('lets only one caller create the refund', () => {
    let state: LockState = {
      challengeStatus: 'active',
      settlementStatus: 'pending',
      refundId: null,
    }
    const first = tryAcquireSettlementLock(state)
    expect(first.acquired).toBe(true)
    if (first.acquired) state = first.next
    expect(state.challengeStatus).toBe('settling')

    const second = tryAcquireSettlementLock(state)
    expect(second.acquired).toBe(false)
  })

  it('never refunds twice after a refund succeeds', () => {
    let state: LockState = {
      challengeStatus: 'active',
      settlementStatus: 'pending',
      refundId: null,
    }
    const acquired = tryAcquireSettlementLock(state)
    if (acquired.acquired) state = acquired.next
    state = recordRefundInitiated(state, 'refund-1')
    state = recordRefundSucceeded(state)
    expect(state).toMatchObject({
      challengeStatus: 'settled',
      settlementStatus: 'settled',
      refundId: 'refund-1',
    })
    expect(tryAcquireSettlementLock(state).acquired).toBe(false)
  })

  it('closes without a refund when the won-back balance is zero', () => {
    let state: LockState = {
      challengeStatus: 'active',
      settlementStatus: 'pending',
      refundId: null,
    }
    state = recordNoRefund(state)
    expect(state).toMatchObject({ challengeStatus: 'settled', settlementStatus: 'none' })
    expect(tryAcquireSettlementLock(state).acquired).toBe(false)
  })

  it('keeps settlement pending until the refund succeeds', () => {
    expect(nextSettlementStatus('pending', false)).toBe('pending')
    expect(nextSettlementStatus('pending', true)).toBe('settled')
  })

  it('only allows a refund while settlement is still pending', () => {
    expect(shouldCreateRefund('pending')).toBe(true)
    expect(shouldCreateRefund('settled')).toBe(false)
    expect(shouldCreateRefund('none')).toBe(false)
  })
})
