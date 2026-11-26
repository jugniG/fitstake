import { angleAt, bestSide } from '../geometry'
import type { FrameEval, Landmark } from '../types'

// Hip(23/24) -> knee(25/26) -> ankle(27/28)
const SIDES: ReadonlyArray<readonly [number, number, number]> = [
  [23, 25, 27],
  [24, 26, 28],
]

/**
 * Evaluates whether the user is in a squat position.
 *
 * Rejects false positives caused by leaning forward or reaching for a laptop/desk:
 * 1. Requires deep knee flexion (angle <= 110° instead of shallow 140°).
 * 2. Requires genuine hip descent (hips must drop vertically relative to shins).
 * 3. Distinguishes torso bends ("good mornings" / desk reaches) using shoulder landmarks when visible.
 */
export function evaluateSquat(lm: Landmark[] | null): FrameEval {
  if (!lm) return { phase: 'a', confidence: 0, visible: false }
  const side = bestSide(lm, SIDES)
  if (!side) return { phase: 'a', confidence: 0, visible: false }

  const [hip, knee, ankle] = side
  const hipLm = lm[hip]
  const kneeLm = lm[knee]
  const ankleLm = lm[ankle]

  const confidence = Math.min(
    hipLm.visibility ?? 1,
    kneeLm.visibility ?? 1,
    ankleLm.visibility ?? 1,
  )

  if (confidence < 0.4) {
    return { phase: 'a', confidence, visible: false }
  }

  const kneeAngle = angleAt(hipLm, kneeLm, ankleLm)

  // Vertical displacement check:
  // In normalized coords, y=0 is top and y=1 is bottom.
  // Standing: hip is well above knee (thighHeight is roughly equal to shinHeight).
  // In a squat: hips drop down toward knees, so thighHeight shrinks dramatically.
  const thighHeight = kneeLm.y - hipLm.y
  const shinHeight = Math.max(0.05, ankleLm.y - kneeLm.y)
  const thighToShinRatio = thighHeight / shinHeight

  // Torso / waist bend rejection:
  // If shoulder is visible, check if the person is merely bending their spine forward
  // over a desk (hip angle acute while knees remain largely extended).
  const shoulderIdx = hip === 23 ? 11 : 12
  const shoulderLm = lm.at(shoulderIdx)
  let isForwardBendOnly = false
  if (shoulderLm && (shoulderLm.visibility ?? 1) > 0.4) {
    const hipAngle = angleAt(shoulderLm, hipLm, kneeLm)
    // Leaning forward at the waist with soft or extended knees
    if (hipAngle < 90 && kneeAngle > 115) {
      isForwardBendOnly = true
    }
  }

  // Squat criteria:
  // - Knee flexed <= 110°
  // - Hips descended (thighToShinRatio < 0.65)
  // - Not a forward bow/laptop reach
  const isSquatting = kneeAngle <= 110 && thighToShinRatio < 0.65 && !isForwardBendOnly

  return {
    phase: isSquatting ? 'b' : 'a',
    confidence,
    visible: confidence > 0.5,
  }
}
