// Pure domain types for habit-stakes. Shared by the pure modules and the server layer
// that adapts them to Drizzle rows. No Drizzle/React imports here.

export type ExerciseType = 'squat' | 'push_up' | 'jumping_jack' | 'custom_gesture' | 'leg_raise'

export type CustomGesture = 'pinch' | 'fist' | 'open_hand'

export type ChallengeStatus = 'pending_charge' | 'active' | 'settling' | 'settled'

export type DayStatus = 'locked' | 'pending' | 'completed' | 'forfeited'

export type SettlementStatus = 'pending' | 'settled' | 'none'

export type RoutineExercise = {
  exerciseType: ExerciseType
  customGesture?: CustomGesture | null
  targetSets: number
  targetReps: number
}

export type ChallengeConfig = {
  exerciseType: ExerciseType
  customGesture: CustomGesture | null
  targetReps: number
  targetSets: number
  dailyStakeAmount: number // whole USD dollars
  totalDays: number
}

export type ChallengePlan = ChallengeConfig & {
  id: string
  userId: string
  totalCommitmentAmount: number // whole USD dollars
  timezone: string
  createdAt: string
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
