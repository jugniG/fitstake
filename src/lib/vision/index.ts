import type { CustomGesture, ExerciseType } from '#/lib/challenge'
import { createRepCounter } from './rep-counter'
import { evaluateSquat } from './exercises/squat'
import { evaluatePushUp } from './exercises/push-up'
import { evaluateJumpingJack } from './exercises/jumping-jack'
import { evaluateHandGesture } from './exercises/custom-gesture'
import type { RepCounter } from './types'

export function buildRepCounter(
  exercise: ExerciseType,
  customGesture?: CustomGesture | null,
): RepCounter {
  switch (exercise) {
    case 'squat':
      return createRepCounter({ evaluate: evaluateSquat })
    case 'push_up':
      return createRepCounter({ evaluate: evaluatePushUp })
    case 'jumping_jack':
      return createRepCounter({ evaluate: evaluateJumpingJack })
    case 'custom_gesture':
      return createRepCounter({
        evaluate: (lm) => evaluateHandGesture(lm, customGesture ?? 'pinch'),
      })
  }
}

export * from './types'
export { angleAt, distance, bestSide } from './geometry'
export { createRepCounter } from './rep-counter'
export { evaluateSquat } from './exercises/squat'
export { evaluatePushUp } from './exercises/push-up'
export { evaluateJumpingJack } from './exercises/jumping-jack'
export { evaluateHandGesture } from './exercises/custom-gesture'
export { createLivenessGuard } from './liveness'
export { closeVision, detectHand, detectPose, getHandLandmarker, getLandmarkerFor, getPoseLandmarker } from './engine'
export type { VisionLandmarker } from './engine'
