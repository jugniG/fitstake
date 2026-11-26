import { distance } from '../geometry'
import type { FrameEval, Landmark } from '../types'

// Open = wrists above shoulders (y is smaller up the screen) AND ankles spread wider than shoulders.
export function evaluateJumpingJack(lm: Landmark[] | null): FrameEval {
  if (!lm) return { phase: 'a', confidence: 0, visible: false }
  const leftShoulder = lm.at(11)
  const rightShoulder = lm.at(12)
  const leftWrist = lm.at(15)
  const rightWrist = lm.at(16)
  const leftAnkle = lm.at(27)
  const rightAnkle = lm.at(28)
  if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist || !leftAnkle || !rightAnkle) {
    return { phase: 'a', confidence: 0, visible: false }
  }

  const confidence = Math.min(
    leftShoulder.visibility ?? 1,
    rightShoulder.visibility ?? 1,
    leftWrist.visibility ?? 1,
    rightWrist.visibility ?? 1,
    leftAnkle.visibility ?? 1,
    rightAnkle.visibility ?? 1,
  )
  const shoulderWidth = distance(leftShoulder, rightShoulder) || 0.0001
  const armsUp = leftWrist.y < leftShoulder.y - 0.1 && rightWrist.y < rightShoulder.y - 0.1
  const legsSpread = distance(leftAnkle, rightAnkle) > shoulderWidth * 1.3
  return { phase: armsUp && legsSpread ? 'b' : 'a', confidence, visible: confidence > 0.5 }
}
