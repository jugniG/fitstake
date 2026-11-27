import { describe, expect, it } from 'vitest'
import { FALLBACK, readDefaultStake, readPaywallEnabled } from './experiments'

describe('paywall_enabled', () => {
  it('skips the paywall only for an enabled flag set to "off"', () => {
    expect(readPaywallEnabled({ enabled: true, value: 'off' })).toBe(false)
    expect(readPaywallEnabled({ enabled: true, value: ' OFF ' })).toBe(false)
    expect(readPaywallEnabled({ enabled: true, value: 'on' })).toBe(true)
  })

  it('keeps the paywall when Flagsmith is unavailable or the flag is odd', () => {
    expect(readPaywallEnabled(null)).toBe(FALLBACK.paywallEnabled)
    expect(readPaywallEnabled({ enabled: false, value: 'off' })).toBe(true)
    expect(readPaywallEnabled({ enabled: true, value: null })).toBe(true)
  })
})

describe('default_stake', () => {
  it('uses the remote value when it is a sensible whole-dollar stake', () => {
    expect(readDefaultStake({ enabled: true, value: 5 })).toBe(5)
    expect(readDefaultStake({ enabled: true, value: '20' })).toBe(20)
  })

  it('falls back to $10 for missing, disabled or invalid values', () => {
    expect(readDefaultStake(null)).toBe(FALLBACK.defaultStake)
    expect(readDefaultStake({ enabled: false, value: 5 })).toBe(10)
    for (const value of ['abc', 0, -5, 7.5, 1_000_000, null]) {
      expect(readDefaultStake({ enabled: true, value })).toBe(10)
    }
  })
})
