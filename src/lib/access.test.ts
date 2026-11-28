import { describe, expect, it } from 'vitest'
import {
  appAccessReason,
  canStartChallenge,
  lifetimeTrialChargeDue,
  lifetimeTrialGrantsAccess,
  newChallengeBlocker,
  parseDodoSubscription,
  trialDaysForCheckout,
} from './access'

const now = new Date('2026-06-01T12:00:00Z')
const later = new Date('2026-06-10T00:00:00Z')
const earlier = new Date('2026-05-01T00:00:00Z')

const reasonFor = (
  subscription: { status: string; trialEndsAt: Date | null; endsAt: Date | null } | null,
  extra: { hasLifetime?: boolean; hasRunningChallenge?: boolean } = {},
) =>
  appAccessReason(
    {
      hasLifetime: extra.hasLifetime ?? false,
      subscription,
      hasRunningChallenge: extra.hasRunningChallenge ?? false,
    },
    now,
  )

describe('app access', () => {
  it('grants access to an active subscription, as a trial while the trial lasts', () => {
    expect(reasonFor({ status: 'active', trialEndsAt: later, endsAt: null })).toBe('trial')
    expect(reasonFor({ status: 'active', trialEndsAt: earlier, endsAt: null })).toBe('subscribed')
    expect(reasonFor({ status: 'active', trialEndsAt: null, endsAt: null })).toBe('subscribed')
  })

  it('keeps a scheduled cancellation until the end date, then revokes', () => {
    expect(reasonFor({ status: 'active', trialEndsAt: null, endsAt: later })).toBe('subscribed')
    expect(reasonFor({ status: 'active', trialEndsAt: null, endsAt: earlier })).toBe('none')
  })

  it('denies on-hold, cancelled, failed, expired, pending or missing subscriptions', () => {
    for (const status of ['on_hold', 'cancelled', 'failed', 'expired', 'pending']) {
      expect(reasonFor({ status, trialEndsAt: null, endsAt: null })).toBe('none')
    }
    expect(reasonFor(null)).toBe('none')
  })

  it('lets a lapsed user finish a running challenge but not start one', () => {
    const reason = reasonFor(null, { hasRunningChallenge: true })
    expect(reason).toBe('running_challenge')
    expect(canStartChallenge(reason)).toBe(false)
  })

  it('grants lifetime access forever and prefers it over a dead weekly plan', () => {
    expect(reasonFor(null, { hasLifetime: true })).toBe('lifetime')
    expect(
      reasonFor({ status: 'cancelled', trialEndsAt: null, endsAt: earlier }, { hasLifetime: true }),
    ).toBe('lifetime')
  })

  it('lets a planless user in when the paywall experiment turns the paywall off', () => {
    const reason = appAccessReason(
      { hasLifetime: false, subscription: null, hasRunningChallenge: false, paywallEnabled: false },
      now,
    )
    expect(reason).toBe('paywall_off')
    expect(canStartChallenge(reason)).toBe(true)
    // A paid plan still wins, and the default keeps today's paywall.
    expect(
      appAccessReason(
        {
          hasLifetime: true,
          subscription: null,
          hasRunningChallenge: false,
          paywallEnabled: false,
        },
        now,
      ),
    ).toBe('lifetime')
    expect(reasonFor(null)).toBe('none')
  })

  it('offers the 3-day trial only once', () => {
    expect(trialDaysForCheckout(false)).toBe(3)
    expect(trialDaysForCheckout(true)).toBe(0)
  })
})

describe('lifetime trial', () => {
  const trialFor = (status: string, trialEndsAt: Date) => ({ status, trialEndsAt })

  it('grants trial access during the 3 days and while the $9.99 charge is due or processing', () => {
    for (const trial of [
      trialFor('trialing', later),
      trialFor('trialing', earlier),
      trialFor('charging', earlier),
    ]) {
      expect(
        appAccessReason(
          {
            hasLifetime: false,
            subscription: null,
            hasRunningChallenge: false,
            lifetimeTrial: trial,
          },
          now,
        ),
      ).toBe('trial')
    }
  })

  it('keeps a cancelled trial until it ends, and gives nothing after a failed charge', () => {
    expect(lifetimeTrialGrantsAccess(trialFor('cancelled', later), now)).toBe(true)
    expect(lifetimeTrialGrantsAccess(trialFor('cancelled', earlier), now)).toBe(false)
    expect(lifetimeTrialGrantsAccess(trialFor('failed', later), now)).toBe(false)
  })

  it('charges only an uncancelled trial whose 3 days are over', () => {
    expect(lifetimeTrialChargeDue(trialFor('trialing', earlier), now)).toBe(true)
    expect(lifetimeTrialChargeDue(trialFor('trialing', later), now)).toBe(false)
    expect(lifetimeTrialChargeDue(trialFor('cancelled', earlier), now)).toBe(false)
    expect(lifetimeTrialChargeDue(trialFor('charging', earlier), now)).toBe(false)
    expect(lifetimeTrialChargeDue(null, now)).toBe(false)
  })
})

describe('newChallengeBlocker', () => {
  it('needs a plan', () => {
    expect(newChallengeBlocker({ reason: 'none', owedAmount: 0 })).toBe('no_plan')
    expect(newChallengeBlocker({ reason: 'running_challenge', owedAmount: 0 })).toBe('no_plan')
  })

  it('blocks while missed days are unpaid', () => {
    expect(newChallengeBlocker({ reason: 'lifetime', owedAmount: 10 })).toBe('owes_charges')
    expect(newChallengeBlocker({ reason: 'trial', owedAmount: 0 })).toBe(null)
  })
})

describe('parseDodoSubscription', () => {
  it('reads a Dodo subscription payload and derives trial and end dates', () => {
    const parsed = parseDodoSubscription({
      subscription_id: 'sub_1',
      status: 'active',
      product_id: 'pdt_weekly',
      on_demand: false,
      customer: { customer_id: 'cus_1' },
      created_at: '2026-06-01T12:00:00Z',
      trial_period_days: 3,
      next_billing_date: '2026-06-04T12:00:00Z',
      cancel_at_next_billing_date: true,
      metadata: { kind: 'weekly', userId: 'user_1' },
    })
    expect(parsed).toMatchObject({
      dodoSubscriptionId: 'sub_1',
      status: 'active',
      productId: 'pdt_weekly',
      dodoCustomerId: 'cus_1',
      onDemand: false,
      metadata: { kind: 'weekly', userId: 'user_1' },
    })
    expect(parsed?.trialEndsAt?.toISOString()).toBe('2026-06-04T12:00:00.000Z')
    expect(parsed?.endsAt?.toISOString()).toBe('2026-06-04T12:00:00.000Z')
  })

  it('has no trial or end date for a plain active subscription', () => {
    const parsed = parseDodoSubscription({
      subscription_id: 'sub_2',
      status: 'active',
      trial_period_days: 0,
      next_billing_date: '2026-06-08T12:00:00Z',
      cancel_at_next_billing_date: false,
    })
    expect(parsed?.trialEndsAt).toBeNull()
    expect(parsed?.endsAt).toBeNull()
  })

  it('rejects payloads without an id or status', () => {
    expect(parseDodoSubscription({ status: 'active' })).toBeNull()
    expect(parseDodoSubscription({ subscription_id: 'sub_1' })).toBeNull()
  })
})
