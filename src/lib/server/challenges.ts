import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { isValidTimeZone } from '#/lib/challenge'
import type { DayStatus, ExerciseType, SettlementStatus } from '#/lib/challenge'
import * as server from './challenges.server'

const createChallengeSchema = z.object({
  exerciseType: z.enum(['squat', 'push_up', 'jumping_jack', 'custom_gesture']),
  customGesture: z.enum(['pinch', 'fist', 'open_hand']).nullable(),
  targetReps: z.number().int().min(1).max(1000),
  targetSets: z.number().int().min(1).max(100),
  dailyStakeAmount: z.number().int().min(1).max(100_000),
  totalDays: z.number().int().min(1).max(365),
  startDayOffset: z.union([z.literal(0), z.literal(1)]),
  timezone: z.string().min(1).max(64).refine(isValidTimeZone, 'Choose a valid IANA timezone.'),
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
    totalCommitmentAmount: number
    status: string
    settlementStatus: SettlementStatus
    timezone: string | null
    activatedAt: string | null
    kelviqCheckoutUrl: string | null
    kelviqOrderId: string | null
    startDayOffset: number | null
  } | null
  days: Array<{
    dayNumber: number
    localDate: string
    status: DayStatus
    windowStartUtc: string
    windowEndUtc: string
    completedAt: string | null
  }>
  totals: {
    totalCommitment: number
    dailyStake: number
    totalDays: number
    completedDays: number
    forfeitedDays: number
    remainingDays: number
    wonBackBalance: number
    forfeitedBalance: number
    remainingAmount: number
  }
}

export const createChallenge = createServerFn({ method: 'POST' })
  .validator((data: CreateChallengeInput) => createChallengeSchema.parse(data))
  .handler(async ({ data }) => {
    return server.createChallengeImpl(data)
  })

export const startChallengeCheckout = createServerFn({ method: 'POST' }).handler(async () => {
  return server.startChallengeCheckoutImpl()
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
  biometrics: z
    .object({
      baselineBpm: z.number(),
      peakBpm: z.number(),
      recoveryBpmDrop: z.number(),
      cardioExertionScore: z.number(),
    })
    .optional(),
})

export const completeDay = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      dayNumber: number
      setsCompleted: number
      totalReps: number
      confidence: number
      sessionToken: string
      biometrics?: {
        baselineBpm: number
        peakBpm: number
        recoveryBpmDrop: number
        cardioExertionScore: number
      }
    }) => completeDaySchema.parse(data),
  )
  .handler(async ({ data }) => {
    return server.completeDayImpl(data)
  })
