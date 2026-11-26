import { describe, expect, it } from 'vitest'
import { angleAt, distance } from './geometry'
import type { Landmark } from './types'

const lm = (x: number, y: number, z = 0, visibility = 1): Landmark => ({ x, y, z, visibility })

describe('geometry helpers', () => {
  it('measures a straight line as 180 degrees', () => {
    expect(angleAt(lm(0, -1), lm(0, 0), lm(0, 1))).toBeCloseTo(180, 0)
  })

  it('measures a right angle as 90 degrees', () => {
    expect(angleAt(lm(1, 0), lm(0, 0), lm(0, 1))).toBeCloseTo(90, 0)
  })

  it('computes euclidean distance', () => {
    expect(distance(lm(0, 0), lm(3, 4))).toBeCloseTo(5, 5)
  })
})
