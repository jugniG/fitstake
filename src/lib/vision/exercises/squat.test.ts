import { describe, expect, it } from 'vitest'
import type { Landmark } from '../types'
import { evaluateSquat } from './squat'

function buildLandmarks(overrides: Partial<Record<number, Partial<Landmark>>> = {}): Landmark[] {
  const landmarks: Landmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.9,
  }))

  // Default: standing upright
  // Shoulder (left: 11)
  landmarks[11] = { x: 0.5, y: 0.2, z: 0, visibility: 0.95 }
  // Hip (left: 23)
  landmarks[23] = { x: 0.5, y: 0.5, z: 0, visibility: 0.95 }
  // Knee (left: 25)
  landmarks[25] = { x: 0.5, y: 0.72, z: 0, visibility: 0.95 }
  // Ankle (left: 27)
  landmarks[27] = { x: 0.5, y: 0.92, z: 0, visibility: 0.95 }

  for (const [idxStr, point] of Object.entries(overrides)) {
    const idx = Number(idxStr)
    landmarks[idx] = { ...landmarks[idx], ...point }
  }

  return landmarks
}

describe('evaluateSquat', () => {
  it('identifies standing position as baseline (phase a)', () => {
    const standing = buildLandmarks()
    const result = evaluateSquat(standing)
    expect(result.phase).toBe('a')
    expect(result.visible).toBe(true)
  })

  it('rejects bending forward at the waist (e.g. typing or reaching for laptop)', () => {
    // User bends torso forward towards laptop desk:
    // Shoulder moves forward and lower
    // Hips push back slightly but DO NOT drop toward knees
    // Knees soften slightly (e.g. angle ~140°)
    const laptopBend = buildLandmarks({
      11: { x: 0.5, y: 0.42, z: -0.25, visibility: 0.95 }, // shoulder dropped forward
      23: { x: 0.5, y: 0.5, z: 0.15, visibility: 0.95 }, // hip still at y=0.5
      25: { x: 0.5, y: 0.72, z: 0.05, visibility: 0.95 }, // knee
      27: { x: 0.5, y: 0.92, z: 0, visibility: 0.95 }, // ankle
    })

    const result = evaluateSquat(laptopBend)
    // Must remain phase 'a' - must NOT count as a squat!
    expect(result.phase).toBe('a')
  })

  it('identifies a genuine deep squat with knee flexion and hip descent as phase b', () => {
    // In a squat, hips drop down close to knee level (y=0.69 vs knee y=0.72)
    // and knee angle closes to ~90°-105°
    const deepSquat = buildLandmarks({
      11: { x: 0.5, y: 0.42, z: 0, visibility: 0.95 },
      23: { x: 0.4, y: 0.69, z: -0.1, visibility: 0.95 }, // hip descended
      25: { x: 0.6, y: 0.72, z: 0.1, visibility: 0.95 }, // knee pushed forward
      27: { x: 0.45, y: 0.92, z: 0, visibility: 0.95 }, // ankle
    })

    const result = evaluateSquat(deepSquat)
    expect(result.phase).toBe('b')
  })

  it('tolerates close-range positioning where ankles are below the camera frame', () => {
    // User is standing close (~3 ft away): hips and knees are visible, but ankles are off-screen (visibility 0.1)
    const closeDeepSquat = buildLandmarks({
      11: { x: 0.5, y: 0.35, z: 0, visibility: 0.95 },
      23: { x: 0.4, y: 0.69, z: -0.1, visibility: 0.95 }, // hip descended
      25: { x: 0.6, y: 0.72, z: 0.1, visibility: 0.95 }, // knee pushed forward
      27: { x: 0.45, y: 0.98, z: 0, visibility: 0.1 }, // ankle cut off at bottom
    })

    const result = evaluateSquat(closeDeepSquat)
    expect(result.phase).toBe('b')
    expect(result.visible).toBe(true)
  })

  it('handles missing or low-visibility landmarks safely', () => {
    expect(evaluateSquat(null)).toEqual({ phase: 'a', confidence: 0, visible: false })

    const occluded = buildLandmarks({
      25: { visibility: 0.1 },
      26: { visibility: 0.1 },
    })
    const result = evaluateSquat(occluded)
    expect(result.visible).toBe(false)
  })
})
