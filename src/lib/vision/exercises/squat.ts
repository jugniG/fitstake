import { angleAt, bestSide } from '../geometry'
import type { FrameEval, Landmark } from '../types'

// Hip(23/24) -> knee(25/26) -> ankle(27/28). Baseline (standing) knee extended, flexed (squat) knee bent.
const SIDES: ReadonlyArray<readonly [number, number, number]> = [
  [23, 25, 27],
  [24, 26, 28],
]

export function evaluateSquat(lm: Landmark[] | null): FrameEval {
  if (!lm) return { phase: 'a', confidence: 0, visible: false }
  const side = bestSide(lm, SIDES)
  if (!side) return { phase: 'a', confidence: 0, visible: false }
  const [hip, knee, ankle] = side
  const angle = angleAt(lm[hip], lm[knee], lm[ankle])
  const confidence = Math.min(lm[hip].visibility ?? 1, lm[knee].visibility ?? 1, lm[ankle].visibility ?? 1)
  return { phase: angle < 140 ? 'b' : 'a', confidence, visible: confidence > 0.5 }
}
