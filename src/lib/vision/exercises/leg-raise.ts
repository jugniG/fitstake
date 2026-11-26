import { angleAt, bestSide } from '../geometry'
import type { FrameEval, Landmark } from '../types'

// Shoulder(11/12) -> Hip(23/24) -> Ankle(27/28)
const SIDES: ReadonlyArray<readonly [number, number, number]> = [
  [11, 23, 27],
  [12, 24, 28],
]

/**
 * Evaluates lying leg raises.
 * The user lies supine on a mat.
 * - Phase 'a' (down): Legs extended horizontally near the floor (angle >= 140° or ankles near hip height).
 * - Phase 'b' (up): Legs raised towards 90° vertical (angle <= 115° or ankles elevated well above hips).
 */
export function evaluateLegRaise(lm: Landmark[] | null): FrameEval {
  if (!lm) return { phase: 'a', confidence: 0, visible: false }

  const side = bestSide(lm, SIDES)
  if (!side) return { phase: 'a', confidence: 0, visible: false }

  const [shoulderIdx, hipIdx, ankleIdx] = side
  const shoulder = lm[shoulderIdx]
  const hip = lm[hipIdx]
  const ankle = lm[ankleIdx]

  const confidence = Math.min(shoulder.visibility ?? 1, hip.visibility ?? 1, ankle.visibility ?? 1)

  const angle = angleAt(shoulder, hip, ankle)

  // In video coordinates, smaller y is higher up towards the top of the frame.
  const anklesElevated = ankle.y < hip.y - 0.15
  const isUp = angle <= 115 || anklesElevated

  return {
    phase: isUp ? 'b' : 'a',
    confidence,
    visible: confidence > 0.4,
  }
}
