import { distance } from '../geometry'
import type { CustomGesture } from '#/lib/challenge'
import type { FrameEval, Landmark } from '../types'

// Hand landmarks (21): 0 wrist, 9 middle MCP (palm reference), 4 thumb tip, 8/12/16/20 finger tips.
export function evaluateHandGesture(lm: Landmark[] | null, gesture: CustomGesture): FrameEval {
  if (!lm) return { phase: 'a', confidence: 0, visible: false }
  const wrist = lm.at(0)
  const middleMcp = lm.at(9)
  const thumbTip = lm.at(4)
  const indexTip = lm.at(8)
  const middleTip = lm.at(12)
  const pinkyTip = lm.at(20)
  if (!wrist || !middleMcp || !thumbTip || !indexTip || !middleTip || !pinkyTip) {
    return { phase: 'a', confidence: 0, visible: false }
  }
  const handSize = distance(wrist, middleMcp) || 0.0001

  let detected = false
  if (gesture === 'pinch') {
    detected = distance(thumbTip, indexTip) < handSize * 0.4
  } else if (gesture === 'fist') {
    detected =
      distance(indexTip, wrist) < handSize * 0.9 &&
      distance(middleTip, wrist) < handSize * 0.9 &&
      distance(pinkyTip, wrist) < handSize * 0.9
  } else {
    // open_hand: index and middle extended away from the wrist
    detected =
      distance(indexTip, wrist) > handSize * 1.6 && distance(middleTip, wrist) > handSize * 1.6
  }

  return { phase: detected ? 'b' : 'a', confidence: 1, visible: true }
}
