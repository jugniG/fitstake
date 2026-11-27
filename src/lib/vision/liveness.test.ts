import { describe, expect, it } from 'vitest'
import { createLivenessGuard } from './liveness'
import type { Landmark } from './types'

function makeMockSkeleton(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  visibility = 0.9,
): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: 0,
    visibility,
  }))
  // Head
  lm[0] = { x: (minX + maxX) / 2, y: minY, z: 0, visibility }
  // Shoulders
  lm[11] = { x: minX, y: minY + (maxY - minY) * 0.2, z: 0, visibility }
  lm[12] = { x: maxX, y: minY + (maxY - minY) * 0.2, z: 0, visibility }
  // Hips
  lm[23] = { x: minX, y: minY + (maxY - minY) * 0.5, z: 0, visibility }
  lm[24] = { x: maxX, y: minY + (maxY - minY) * 0.5, z: 0, visibility }
  // Knees
  lm[25] = { x: minX, y: minY + (maxY - minY) * 0.75, z: 0, visibility }
  lm[26] = { x: maxX, y: minY + (maxY - minY) * 0.75, z: 0, visibility }
  // Ankles
  lm[27] = { x: minX, y: maxY, z: 0, visibility }
  lm[28] = { x: maxX, y: maxY, z: 0, visibility }
  return lm
}

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

  it('detects miniature screen replay on mobile device during squat', () => {
    const guard = createLivenessGuard()
    guard.onFrame(0)

    // Handheld phone replay: full body occupying only 25% height and 20% width at bottom of screen
    const miniaturePhoneReplay = makeMockSkeleton(0.4, 0.6, 0.65, 0.92)

    guard.onFrame(33, miniaturePhoneReplay, 'squat')
    const secondFrame = guard.onFrame(66, miniaturePhoneReplay, 'squat')

    expect(secondFrame.ok).toBe(false)
    expect(secondFrame.isSpoof).toBe(true)
    expect(secondFrame.reason).toContain('Screen replay detected')
  })

  it('permits legitimate live human squat framing', () => {
    const guard = createLivenessGuard()
    guard.onFrame(0)

    // Real human in front of webcam: head at y=0.15, ankles at y=0.92 (height = 0.77)
    const liveHumanSquat = makeMockSkeleton(0.3, 0.7, 0.15, 0.92)

    const frame1 = guard.onFrame(33, liveHumanSquat, 'squat')
    const frame2 = guard.onFrame(66, liveHumanSquat, 'squat')

    expect(frame1.ok).toBe(true)
    expect(frame2.ok).toBe(true)
  })

  it('permits legitimate live human push-up on floor', () => {
    const guard = createLivenessGuard()
    guard.onFrame(0)

    // Real human horizontal push-up: width stretches across frame (x=0.2 to 0.8, width=0.6)
    const livePushUp = makeMockSkeleton(0.2, 0.8, 0.55, 0.8)

    const frame1 = guard.onFrame(33, livePushUp, 'push_up')
    const frame2 = guard.onFrame(66, livePushUp, 'push_up')

    expect(frame1.ok).toBe(true)
    expect(frame2.ok).toBe(true)
  })
})
