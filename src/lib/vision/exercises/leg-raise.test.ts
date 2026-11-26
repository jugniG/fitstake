import { describe, expect, it } from 'vitest'
import type { Landmark } from '../types'
import { evaluateLegRaise } from './leg-raise'

function makeLandmark(x: number, y: number, visibility = 0.9): Landmark {
  return { x, y, z: 0, visibility }
}

describe('evaluateLegRaise', () => {
  it('returns not visible when landmarks are null', () => {
    const result = evaluateLegRaise(null)
    expect(result.visible).toBe(false)
    expect(result.phase).toBe('a')
  })

  it('detects phase a when legs are horizontal near the floor', () => {
    // Lie flat: shoulder at (0.3, 0.7), hip at (0.5, 0.7), ankle at (0.8, 0.7) -> angle = 180°
    const lm: Landmark[] = Array.from({ length: 33 }, () => makeLandmark(0, 0, 0))
    lm[11] = makeLandmark(0.3, 0.7) // Left shoulder
    lm[23] = makeLandmark(0.5, 0.7) // Left hip
    lm[27] = makeLandmark(0.8, 0.7) // Left ankle

    const result = evaluateLegRaise(lm)
    expect(result.visible).toBe(true)
    expect(result.phase).toBe('a')
  })

  it('detects phase b when legs are raised vertical to 90 degrees', () => {
    // Lie flat: shoulder at (0.3, 0.7), hip at (0.5, 0.7), ankle raised at (0.5, 0.3) -> angle = 90°
    const lm: Landmark[] = Array.from({ length: 33 }, () => makeLandmark(0, 0, 0))
    lm[11] = makeLandmark(0.3, 0.7) // Left shoulder
    lm[23] = makeLandmark(0.5, 0.7) // Left hip
    lm[27] = makeLandmark(0.5, 0.3) // Left ankle (elevated)

    const result = evaluateLegRaise(lm)
    expect(result.visible).toBe(true)
    expect(result.phase).toBe('b')
  })
})
