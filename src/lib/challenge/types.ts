// Pure domain types for habit-stakes. Shared by the pure modules and the server layer
// that adapts them to Drizzle rows. No Drizzle/React imports here.

export type ExerciseType = 'squat' | 'push_up' | 'jumping_jack' | 'custom_gesture' | 'leg_raise'

export type CustomGesture = 'pinch' | 'fist' | 'open_hand'

export type ChallengeStatus = 'pending_mandate' | 'active' | 'mandate_lost' | 'completed'

export type DayStatus = 'locked' | 'pending' | 'completed' | 'forfeited'

export type StakeChargeStatus = 'claimed' | 'pending' | 'succeeded' | 'failed' | 'abandoned'

export type RoutineExercise = {
  exerciseType: ExerciseType
  customGesture?: CustomGesture | null
  targetSets: number
  targetReps: number
}

export const EXERCISE_LABELS: Record<ExerciseType, string> = {
  squat: 'Squat',
  push_up: 'Push-up',
  jumping_jack: 'Jumping jack',
  custom_gesture: 'Custom gesture',
  leg_raise: 'Lying Leg Raises',
}

export const CUSTOM_GESTURE_LABELS: Record<CustomGesture, string> = {
  pinch: 'Pinch',
  fist: 'Fist',
  open_hand: 'Open hand',
}
