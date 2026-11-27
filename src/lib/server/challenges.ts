import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { isValidTimeZone } from '#/lib/challenge'
import type {
  ChallengeStatus,
  DayStatus,
  ExerciseType,
  LedgerTotals,
  RoutineExercise,
  StakeChargeStatus,
} from '#/lib/challenge'
import type { ChallengeBlocker } from '#/lib/access'
import * as server from './challenges.server'

export const routineExerciseSchema = z.object({
  exerciseType: z.enum(['squat', 'push_up', 'jumping_jack', 'custom_gesture', 'leg_raise']),
  customGesture: z.enum(['pinch', 'fist', 'open_hand']).nullable().optional(),
  targetSets: z.number().int().min(1).max(50),
  targetReps: z.number().int().min(1).max(500),
})

const createChallengeSchema = z.object({
  exercises: z.array(routineExerciseSchema).min(1).max(10),
  dailyStakeAmount: z.number().int().min(1).max(10_000),
  totalDays: z.number().int().min(1).max(365),
  startDayOffset: z.union([z.literal(0), z.literal(1)]),
  timezone: z.string().min(1).max(64).refine(isValidTimeZone, 'Choose a valid IANA timezone.'),
  // The user ticked the consent box. The statement itself is rebuilt on the server.
  consentAccepted: z.literal(true),
})

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>

export type DashboardView = {
  challenge: {
    id: string
    exerciseType: ExerciseType
    customGesture: 'pinch' | 'fist' | 'open_hand' | null
    targetReps: number
    targetSets: number
    dailyStakeAmount: number
    totalDays: number
    status: ChallengeStatus
    timezone: string
    activatedAt: string | null
    startDayOffset: number
    mandateCheckoutUrl: string | null
    consentText: string
    routine: RoutineExercise[]
  } | null
  days: Array<{
    dayNumber: number
    localDate: string
    status: DayStatus
    windowStartUtc: string
    windowEndUtc: string
    completedAt: string | null
    charge: {
      status: StakeChargeStatus
      amount: number
      nextAttemptAt: string | null
      declineMessage: string | null
    } | null
  }>
  totals: LedgerTotals
  newChallengeBlocker: ChallengeBlocker
}

export const createChallenge = createServerFn({ method: 'POST' })
  .validator((data: CreateChallengeInput) => createChallengeSchema.parse(data))
  .handler(async ({ data }) => {
    return server.createChallengeImpl(data)
  })

export const resumeMandateCheckout = createServerFn({ method: 'POST' }).handler(async () => {
  return server.resumeMandateCheckoutImpl()
})

export const startUpdateCard = createServerFn({ method: 'POST' }).handler(async () => {
  return server.startUpdateCardImpl()
})

export const getDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  return server.getDashboardImpl()
})

const startWorkoutSchema = z.object({
  dayNumber: z.number().int().min(1),
})

export const startWorkout = createServerFn({ method: 'POST' })
  .validator((data: { dayNumber: number }) => startWorkoutSchema.parse(data))
  .handler(async ({ data }) => {
    return server.startWorkoutImpl(data)
  })

const completeDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  setsCompleted: z.number().int().min(1),
  totalReps: z.number().int().min(1),
  confidence: z.number().min(0).max(1),
  sessionToken: z.string().min(1),
})

export const completeDay = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      dayNumber: number
      setsCompleted: number
      totalReps: number
      confidence: number
      sessionToken: string
    }) => completeDaySchema.parse(data),
  )
  .handler(async ({ data }) => {
    return server.completeDayImpl(data)
  })

const updateRoutineSchema = z.object({
  routine: z.array(routineExerciseSchema).min(1).max(10),
})

export const updateRoutine = createServerFn({ method: 'POST' })
  .validator((data: { routine: RoutineExercise[] }) => updateRoutineSchema.parse(data))
  .handler(async ({ data }) => {
    return server.updateRoutineImpl(data.routine)
  })
