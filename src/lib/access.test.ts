import { describe, expect, it } from 'vitest'
import {
  appAccessReason,
  canStartChallenge,
  parseSubscriptionObject,
  trialDaysForCheckout,
} from './access'

const now = new Date('2026-06-01T12:00:00Z')
const later = new Date('2026-06-10T00:00:00Z')
const earlier = new Date('2026-05-01T00:00:00Z')

describe('app access', () => {
  it('grants access while trialing or active', () => {
    const trial = { status: 'trialing', trialEndsAt: later, endsAt: null }
    expect(
      appAccessReason({ hasLifetime: false, subscription: trial, hasRunningChallenge: false }, now),
    ).toBe('trial')
    const active = { status: 'active', trialEndsAt: null, endsAt: null }
    expect(
      appAccessReason(
        { hasLifetime: false, subscription: active, hasRunningChallenge: false },
        now,
      ),
    ).toBe('subscribed')
  })

  it('keeps a scheduled cancellation until the end date, then revokes', () => {
    const cancelling = { status: 'active', trialEndsAt: null, endsAt: later }
    expect(
      appAccessReason(
        { hasLifetime: false, subscription: cancelling, hasRunningChallenge: false },
        now,
      ),
    ).toBe('subscribed')
    const ended = { status: 'active', trialEndsAt: null, endsAt: earlier }
    expect(
      appAccessReason({ hasLifetime: false, subscription: ended, hasRunningChallenge: false }, now),
    ).toBe('none')
  })

  it('denies cancelled, past-due or missing subscriptions', () => {
    for (const status of ['cancelled', 'past_due', 'paused', 'superseded']) {
      const subscription = { status, trialEndsAt: null, endsAt: null }
      expect(
        appAccessReason({ hasLifetime: false, subscription, hasRunningChallenge: false }, now),
      ).toBe('none')
    }
    expect(
      appAccessReason({ hasLifetime: false, subscription: null, hasRunningChallenge: false }, now),
    ).toBe('none')
  })

  it('lets a lapsed user finish a running challenge but not start one', () => {
    const reason = appAccessReason(
      { hasLifetime: false, subscription: null, hasRunningChallenge: true },
      now,
    )
    expect(reason).toBe('running_challenge')
    expect(canStartChallenge(reason)).toBe(false)
  })

  it('grants lifetime access with no subscription, forever', () => {
    const reason = appAccessReason(
      { hasLifetime: true, subscription: null, hasRunningChallenge: false },
      new Date('2099-01-01T00:00:00Z'),
    )
    expect(reason).toBe('lifetime')
    expect(canStartChallenge(reason)).toBe(true)
  })

  it('prefers lifetime over a cancelled weekly subscription', () => {
    const cancelled = { status: 'cancelled', trialEndsAt: null, endsAt: earlier }
    expect(
      appAccessReason(
        { hasLifetime: true, subscription: cancelled, hasRunningChallenge: false },
        now,
      ),
    ).toBe('lifetime')
  })

  it('offers the 3-day trial only once', () => {
    expect(trialDaysForCheckout(false)).toBe(3)
    expect(trialDaysForCheckout(true)).toBe(0)
  })
})

describe('parseSubscriptionObject', () => {
  it('reads the Kelviq subscription payload', () => {
    const parsed = parseSubscriptionObject({
      id: 'sub_1',
      status: 'TRIALING',
      plan: { identifier: 'stakefit-yearly' },
      customer: { id: 'kq_cust', customer_id: 'user_1' },
      trial_end: '2026-06-04T12:00:00Z',
      billing_period_end_time: '2027-06-04T12:00:00Z',
      end_date: '2026-12-31',
      modified_on: '2026-06-01T12:00:00Z',
    })
    expect(parsed).toMatchObject({
      kelviqSubscriptionId: 'sub_1',
      status: 'trialing',
      planIdentifier: 'stakefit-yearly',
      userId: 'user_1',
      kelviqCustomerId: 'kq_cust',
    })
    expect(parsed?.endsAt?.toISOString()).toBe('2026-12-31T23:59:59.000Z')
  })

  it('rejects payloads without an id or status', () => {
    expect(parseSubscriptionObject({ status: 'active' })).toBeNull()
    expect(parseSubscriptionObject({ id: 'sub_1' })).toBeNull()
  })
})
