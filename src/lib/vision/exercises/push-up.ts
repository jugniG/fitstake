import { angleAt, bestSide } from '../geometry'
import type { FrameEval, Landmark } from '../types'

// Shoulder(11/12) -> elbow(13/14) -> wrist(15/16). Baseline (up) elbow extended, flexed (down) elbow bent.
const SIDES: ReadonlyArray<readonly [number, number, number]> = [
  [11, 13, 15],
  [12, 14, 16],
]

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
  return { phase: angle < 120 ? 'b' : 'a', confidence, visible: confidence > 0.5 }
}
