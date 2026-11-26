import { describe, expect, it } from 'vitest'
import { createLivenessGuard } from './liveness'

describe('liveness guard', () => {
  it('accepts real-time frame spacing', () => {
    const guard = createLivenessGuard()
    expect(guard.onFrame(0)).toEqual({ ok: true, reason: null })
    expect(guard.onFrame(33)).toEqual({ ok: true, reason: null })
    expect(guard.onFrame(66)).toEqual({ ok: true, reason: null })
  })

  it('rejects impossibly fast (duplicate) frames', () => {
    const guard = createLivenessGuard()
    guard.onFrame(0)
    const result = guard.onFrame(1)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('duplicate-frame')
  })

  it('rejects a long gap (paused or resumed)', () => {
    const guard = createLivenessGuard()
    guard.onFrame(0)
    const result = guard.onFrame(20_000)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('gap')
  })
})
