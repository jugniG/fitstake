import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db, challenge, day, user, workoutVerification } from '#/db'
import { ensureSession } from '#/lib/auth.functions'
import { env } from '#/lib/env'
import { createCommitmentCheckout } from '#/lib/kelviq/checkout'
import { ensureKelviqCustomer } from '#/lib/kelviq/customers'
import { isUniqueViolation } from '#/lib/server/db-errors'
import {
  canCompleteDay,
  computeTotals,
  currentDayStatus,
  isValidTimeZone,
  totalCommitmentAmount,
} from '#/lib/challenge'
import {
  createWorkoutSessionToken,
  verifyWorkoutSessionToken,
  WORKOUT_SESSION_MAX_MS,
} from '#/lib/challenge/session-token'
import type { DayStatus, DayWindow, ExerciseType, SettlementStatus } from '#/lib/challenge'

const ACTIVE_STATES = ['pending_charge', 'active', 'settling'] as const
const MIN_SECONDS_PER_REP = 0.6

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

type SessionUser = { id: string; email: string; name: string }

type ChallengeRow = typeof challenge.$inferSelect

// Create the Kelviq customer before the checkout session so every order event can be linked
// even when it arrives before checkout.completed. Our user id is used as the client-defined
// customer id, which means the link exists before the payment starts.
async function beginCheckout(challengeRow: ChallengeRow, sessionUser: SessionUser) {
  const customer = await ensureKelviqCustomer({
    userId: sessionUser.id,
    email: sessionUser.email,
    name: sessionUser.name,
  })
  await db.update(user).set({ kelviqCustomerId: customer.id }).where(eq(user.id, sessionUser.id))

  const checkout = await createCommitmentCheckout({
    challengeId: challengeRow.id,
    userId: sessionUser.id,
    customerId: customer.customerId,
    amountDollars: challengeRow.totalCommitmentAmount,
  })
  await db
    .update(challenge)
    .set({
      kelviqCheckoutSessionId: checkout.checkoutSessionId,
      kelviqCheckoutUrl: checkout.checkoutUrl,
    })
    .where(eq(challenge.id, challengeRow.id))
  return checkout
}

export const createChallenge = createServerFn({ method: 'POST' })
  .validator(createChallengeSchema)
  .handler(async ({ data }) => {
    const session = await ensureSession()
    const sessionUser = session.user as SessionUser

    const existing = await db.query.challenge.findFirst({
      where: and(
        eq(challenge.userId, sessionUser.id),
        inArray(challenge.status, [...ACTIVE_STATES]),
      ),
      orderBy: desc(challenge.createdAt),
    })

    if (existing) {
      if (existing.status !== 'pending_charge') {
        throw new Error('You already have an active or settling challenge. Finish it first.')
      }
      if (existing.kelviqCheckoutUrl) {
        return {
          checkoutUrl: existing.kelviqCheckoutUrl,
          challengeId: existing.id,
          resumed: true as const,
        }
      }
      try {
        const checkout = await beginCheckout(existing, sessionUser)
        return {
          checkoutUrl: checkout.checkoutUrl,
          challengeId: existing.id,
          resumed: true as const,
        }
      } catch (error) {
        console.error('[challenge] could not resume checkout:', error)
        throw new Error(
          'Payment could not be started. Your challenge is saved — submit again to retry the payment link.',
        )
      }
    }

    const total = totalCommitmentAmount(data)
    let created: ChallengeRow
    try {
      ;[created] = await db
        .insert(challenge)
        .values({
          userId: sessionUser.id,
          exerciseType: data.exerciseType,
          customGesture: data.customGesture,
          targetReps: data.targetReps,
          targetSets: data.targetSets,
          dailyStakeAmount: data.dailyStakeAmount,
          totalDays: data.totalDays,
          totalCommitmentAmount: total,
          status: 'pending_charge',
          startDayOffset: data.startDayOffset,
          timezone: data.timezone,
        })
        .returning()
    } catch (error) {
      if (isUniqueViolation(error, 'challenge_one_live_per_user')) {
        throw new Error('You already have a live challenge. Open the dashboard to continue it.')
      }
      throw error
    }

    try {
      const checkout = await beginCheckout(created, sessionUser)
      return { checkoutUrl: checkout.checkoutUrl, challengeId: created.id, resumed: false as const }
    } catch (error) {
      console.error('[challenge] could not start checkout:', error)
      throw new Error(
        'Payment could not be started. Your challenge is saved — submit again to retry the payment link.',
      )
    }
  })

export const startChallengeCheckout = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await ensureSession()
  const sessionUser = session.user as SessionUser
  const existing = await db.query.challenge.findFirst({
    where: and(eq(challenge.userId, sessionUser.id), eq(challenge.status, 'pending_charge')),
    orderBy: desc(challenge.createdAt),
  })
  if (!existing) throw new Error('There is no pending payment to resume.')
  if (existing.kelviqCheckoutUrl) {
    return { checkoutUrl: existing.kelviqCheckoutUrl, challengeId: existing.id }
  }

  try {
    const checkout = await beginCheckout(existing, sessionUser)
    return { checkoutUrl: checkout.checkoutUrl, challengeId: existing.id }
  } catch (error) {
    console.error('[challenge] retry checkout failed:', error)
    throw new Error('The payment link could not be created. Try again in a moment.')
  }
})

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

function zeroTotals() {
  return {
    totalCommitment: 0,
    dailyStake: 0,
    totalDays: 0,
    completedDays: 0,
    forfeitedDays: 0,
    remainingDays: 0,
    wonBackBalance: 0,
    forfeitedBalance: 0,
    remainingAmount: 0,
  }
}

function toDayWindow(row: {
  dayNumber: number
  localDate: string
  windowStartUtc: Date
  windowEndUtc: Date
}): DayWindow {
  return {
    dayNumber: row.dayNumber,
    localDate: row.localDate,
    windowStartUtc: row.windowStartUtc,
    windowEndUtc: row.windowEndUtc,
  }
}

export const getDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await ensureSession()
  const userId = session.user.id

  const challengeRow = await db.query.challenge.findFirst({
    where: eq(challenge.userId, userId),
    orderBy: desc(challenge.createdAt),
    with: { days: { orderBy: asc(day.dayNumber) } },
  })

  if (!challengeRow) {
    return { challenge: null, days: [], totals: zeroTotals() } satisfies DashboardView
  }

  const challengeView: DashboardView['challenge'] = {
    id: challengeRow.id,
    exerciseType: challengeRow.exerciseType,
    customGesture: challengeRow.customGesture ?? null,
    targetReps: challengeRow.targetReps,
    targetSets: challengeRow.targetSets,
    dailyStakeAmount: challengeRow.dailyStakeAmount,
    totalDays: challengeRow.totalDays,
    totalCommitmentAmount: challengeRow.totalCommitmentAmount,
    status: challengeRow.status,
    settlementStatus: challengeRow.settlementStatus,
    timezone: challengeRow.timezone,
    activatedAt: challengeRow.activatedAt ? challengeRow.activatedAt.toISOString() : null,
    kelviqCheckoutUrl: challengeRow.kelviqCheckoutUrl,
    kelviqOrderId: challengeRow.kelviqOrderId,
    startDayOffset: challengeRow.startDayOffset,
  }

  if (
    challengeRow.status === 'pending_charge' ||
    !challengeRow.activatedAt ||
    !challengeRow.timezone
  ) {
    const pendingTotals = computeTotals(
      {
        dailyStakeAmount: challengeRow.dailyStakeAmount,
        totalDays: challengeRow.totalDays,
        totalCommitmentAmount: challengeRow.totalCommitmentAmount,
      },
      { completed: 0, forfeited: 0 },
    )
    return { challenge: challengeView, days: [], totals: pendingTotals } satisfies DashboardView
  }

  const now = new Date()
  const derived = challengeRow.days.map((d) => {
    const window = toDayWindow(d)
    return { row: d, window, status: currentDayStatus(d.status, window, now) }
  })

  // Lazily persist lapsed days: pending/locked past their deadline become forfeited; the open day becomes pending.
  const forfeitNumbers = derived
    .filter(
      (d) => (d.row.status === 'locked' || d.row.status === 'pending') && d.status === 'forfeited',
    )
    .map((d) => d.row.dayNumber)
  const openNumbers = derived
    .filter((d) => d.row.status === 'locked' && d.status === 'pending')
    .map((d) => d.row.dayNumber)
  if (forfeitNumbers.length > 0) {
    await db
      .update(day)
      .set({ status: 'forfeited' })
      .where(and(eq(day.challengeId, challengeRow.id), inArray(day.dayNumber, forfeitNumbers)))
  }
  if (openNumbers.length > 0) {
    await db
      .update(day)
      .set({ status: 'pending' })
      .where(and(eq(day.challengeId, challengeRow.id), inArray(day.dayNumber, openNumbers)))
  }

  const statuses = derived.map((d) => d.status)
  const completed = statuses.filter((s) => s === 'completed').length
  const forfeited = statuses.filter((s) => s === 'forfeited').length
  const totals = computeTotals(
    {
      dailyStakeAmount: challengeRow.dailyStakeAmount,
      totalDays: challengeRow.totalDays,
      totalCommitmentAmount: challengeRow.totalCommitmentAmount,
    },
    { completed, forfeited },
  )

  const daysView: DashboardView['days'] = derived.map((d) => ({
    dayNumber: d.row.dayNumber,
    localDate: d.row.localDate,
    status: d.status,
    windowStartUtc: d.row.windowStartUtc.toISOString(),
    windowEndUtc: d.row.windowEndUtc.toISOString(),
    completedAt: d.row.completedAt ? d.row.completedAt.toISOString() : null,
  }))

  return { challenge: challengeView, days: daysView, totals } satisfies DashboardView
})

const startWorkoutSchema = z.object({
  dayNumber: z.number().int().min(1),
})

export const startWorkout = createServerFn({ method: 'POST' })
  .validator(startWorkoutSchema)
  .handler(async ({ data }) => {
    const session = await ensureSession()
    const challengeRow = await db.query.challenge.findFirst({
      where: and(eq(challenge.userId, session.user.id), eq(challenge.status, 'active')),
      with: { days: true },
    })
    if (!challengeRow) throw new Error('No active challenge to record against.')
    if (!challengeRow.timezone) throw new Error('This challenge has no pinned timezone.')
    if (!env.BETTER_AUTH_SECRET)
      throw new Error('BETTER_AUTH_SECRET is not set; workouts cannot be verified.')

    const dayRow = challengeRow.days.find((d) => d.dayNumber === data.dayNumber)
    if (!dayRow) throw new Error('Day not found for this challenge.')
    const now = new Date()
    const window = toDayWindow(dayRow)
    const check = canCompleteDay(currentDayStatus(dayRow.status, window, now), window, now)
    if (!check.ok)
      throw new Error(`Day ${data.dayNumber} is not open for recording (${check.reason}).`)

    const startedAtMs = Date.now()
    const token = createWorkoutSessionToken(
      {
        userId: session.user.id,
        challengeId: challengeRow.id,
        dayNumber: data.dayNumber,
        startedAtMs,
      },
      env.BETTER_AUTH_SECRET,
    )
    return { token, startedAtMs, dayNumber: data.dayNumber, maxDurationMs: WORKOUT_SESSION_MAX_MS }
  })

const completeDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  setsCompleted: z.number().int().min(1),
  totalReps: z.number().int().min(1),
  confidence: z.number().min(0).max(1),
  sessionToken: z.string().min(1),
})

export const completeDay = createServerFn({ method: 'POST' })
  .validator(completeDaySchema)
  .handler(async ({ data }) => {
    const session = await ensureSession()
    const userId = session.user.id

    const challengeRow = await db.query.challenge.findFirst({
      where: and(eq(challenge.userId, userId), inArray(challenge.status, ['active', 'settling'])),
      with: { days: true },
    })
    if (!challengeRow) throw new Error('No active challenge to record against.')
    if (challengeRow.status === 'settling') {
      throw new Error('This challenge is already settling; no new completions are accepted.')
    }
    if (!env.BETTER_AUTH_SECRET)
      throw new Error('BETTER_AUTH_SECRET is not set; workouts cannot be verified.')

    const tokenPayload = verifyWorkoutSessionToken(data.sessionToken, env.BETTER_AUTH_SECRET)
    if (!tokenPayload)
      throw new Error('The workout session is invalid or has expired. Start a new session.')
    if (
      tokenPayload.userId !== userId ||
      tokenPayload.challengeId !== challengeRow.id ||
      tokenPayload.dayNumber !== data.dayNumber
    ) {
      throw new Error('This workout session does not belong to this day.')
    }

    const targetReps = challengeRow.targetSets * challengeRow.targetReps
    if (data.setsCompleted !== challengeRow.targetSets) {
      throw new Error(
        `Completed sets (${data.setsCompleted}) do not match the target (${challengeRow.targetSets}).`,
      )
    }
    if (data.totalReps < targetReps) {
      throw new Error(`Completed reps (${data.totalReps}) are below the target (${targetReps}).`)
    }

    const nowMs = Date.now()
    const elapsedMs = nowMs - tokenPayload.startedAtMs
    const minDurationSeconds = Math.ceil(targetReps * MIN_SECONDS_PER_REP)
    const durationSeconds = Math.floor(elapsedMs / 1000)
    if (elapsedMs < minDurationSeconds * 1000) {
      throw new Error(`Session too short for ${targetReps} reps (minimum ${minDurationSeconds}s).`)
    }
    if (elapsedMs > WORKOUT_SESSION_MAX_MS) {
      throw new Error('The workout session expired. Start a new session.')
    }

    const dayRow = challengeRow.days.find((d) => d.dayNumber === data.dayNumber)
    if (!dayRow) throw new Error('Day not found for this challenge.')

    const now = new Date(nowMs)
    const window = toDayWindow(dayRow)
    const check = canCompleteDay(currentDayStatus(dayRow.status, window, now), window, now)
    if (!check.ok) {
      throw new Error(`Cannot record a workout for day ${data.dayNumber}: ${check.reason}.`)
    }

    await db.transaction(async (tx) => {
      await tx.insert(workoutVerification).values({
        challengeId: challengeRow.id,
        dayNumber: data.dayNumber,
        exercise: challengeRow.exerciseType,
        setsCompleted: data.setsCompleted,
        totalReps: data.totalReps,
        confidence: String(data.confidence),
        durationSeconds,
      })
      await tx
        .update(day)
        .set({ status: 'completed', completedAt: now })
        .where(and(eq(day.challengeId, challengeRow.id), eq(day.dayNumber, data.dayNumber)))
    })

    return { ok: true as const, dayNumber: data.dayNumber }
  })
