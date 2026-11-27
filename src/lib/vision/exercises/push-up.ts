import { angleAt, bestSide } from '../geometry'
import type { FrameEval, Landmark } from '../types'

// Shoulder(11/12) -> elbow(13/14) -> wrist(15/16). Baseline (up) elbow extended, flexed (down) elbow bent.
const SIDES: ReadonlyArray<readonly [number, number, number]> = [
  [11, 13, 15],
  [12, 14, 16],
]

/**
 * Evaluates whether the user is in the lowered push-up position.
 *
 * Designed for webcam angles:
 * - Flexed (bottom) threshold set to <= 128° to accommodate perspective foreshortening
 *   when viewed from a desk or laptop camera.
 * - Minimum confidence threshold set to 0.4 to handle partial forearm self-occlusion.
 */
export function evaluatePushUp(lm: Landmark[] | null): FrameEval {
  if (!lm) return { phase: 'a', confidence: 0, visible: false }
  const side = bestSide(lm, SIDES)
  if (!side) return { phase: 'a', confidence: 0, visible: false }
  const [shoulder, elbow, wrist] = side
  const angle = angleAt(lm[shoulder], lm[elbow], lm[wrist])
  const confidence = Math.min(
    lm[shoulder].visibility ?? 1,
    lm[elbow].visibility ?? 1,
    lm[wrist].visibility ?? 1,
  )
  return { phase: angle <= 128 ? 'b' : 'a', confidence, visible: confidence > 0.4 }
}
