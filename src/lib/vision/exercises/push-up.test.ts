import { describe, expect, it } from 'vitest'
import { evaluatePushUp } from './push-up'
import type { Landmark } from '../types'

function makeLandmark(x: number, y: number, visibility = 0.9): Landmark {
  return { x, y, z: 0, visibility }
}

describe('evaluatePushUp', () => {
  it('returns baseline phase a when elbows are extended (top of push-up)', () => {
    const lm: Landmark[] = Array.from({ length: 33 }, () => makeLandmark(0, 0, 0))
    // Left shoulder, elbow, wrist in a straight extended line (~170°)
    lm[11] = makeLandmark(0.3, 0.4)
    lm[13] = makeLandmark(0.3, 0.6)
    lm[15] = makeLandmark(0.3, 0.8)

    const evalResult = evaluatePushUp(lm)
    expect(evalResult.phase).toBe('a')
    expect(evalResult.visible).toBe(true)
    expect(evalResult.confidence).toBeGreaterThan(0.5)
  })

  it('detects flexed phase b when chest lowers and elbows bend <= 128°', () => {
    const lm: Landmark[] = Array.from({ length: 33 }, () => makeLandmark(0, 0, 0))
    // Left shoulder, elbow bent at 90°, wrist on ground
    lm[11] = makeLandmark(0.3, 0.6)
    lm[13] = makeLandmark(0.45, 0.6)
    lm[15] = makeLandmark(0.45, 0.8)

    const evalResult = evaluatePushUp(lm)
    expect(evalResult.phase).toBe('b')
    expect(evalResult.visible).toBe(true)
  })

  it('returns invisible with 0 confidence when landmarks are null', () => {
    const evalResult = evaluatePushUp(null)
    expect(evalResult.visible).toBe(false)
    expect(evalResult.confidence).toBe(0)
  })
})
