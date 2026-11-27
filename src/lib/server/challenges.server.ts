import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { db, challenge, day, user, workoutVerification } from '#/db.server'
import { ensureSession } from '#/lib/auth.functions'
import { env } from '#/lib/env'
import { createCommitmentCheckout } from '#/lib/kelviq/checkout'
import { ensureKelviqCustomer } from '#/lib/kelviq/customers'
import { isUniqueViolation } from '#/lib/server/db-errors'
import {
  canCompleteDay,
  computeTotals,
  currentDayStatus,
  totalCommitmentAmount,
} from '#/lib/challenge'
import {
  createWorkoutSessionToken,
  verifyWorkoutSessionToken,
  WORKOUT_SESSION_MAX_MS,
} from '#/lib/challenge/session-token'
import type { DayWindow, RoutineExercise } from '#/lib/challenge'
import { settleChallenge } from '#/lib/server/settle'
import type { CreateChallengeInput, DashboardView } from './challenges'

const ACTIVE_STATES = ['pending_charge', 'active', 'settling'] as const
const MIN_SECONDS_PER_REP = 0.6

type SessionUser = { id: string; email: string; name: string }
type ChallengeRow = typeof challenge.$inferSelect

async function beginCheckout(challengeRow: ChallengeRow, sessionUser: SessionUser) {
  const userName = sessionUser.name.trim() || undefined

  const customer = await ensureKelviqCustomer({
    userId: sessionUser.id,
    email: sessionUser.email,
    name: userName,
  })
  await db.update(user).set({ kelviqCustomerId: customer.id }).where(eq(user.id, sessionUser.id))

  const checkout = await createCommitmentCheckout({
    challengeId: challengeRow.id,
    userId: sessionUser.id,
    customerId: customer.customerId,
    userName,
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

export async function createChallengeImpl(data: CreateChallengeInput) {
  const session = await ensureSession()
  const sessionUser = session.user as SessionUser

  const existing = await db.query.challenge.findFirst({
    where: and(eq(challenge.userId, sessionUser.id), inArray(challenge.status, [...ACTIVE_STATES])),
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
  const exercises =
    data.exercises && data.exercises.length > 0
      ? data.exercises
      : [
          {
            exerciseType: data.exerciseType ?? 'squat',
            customGesture: data.customGesture ?? null,
            targetSets: data.targetSets ?? 3,
            targetReps: data.targetReps ?? 15,
          },
        ]
  const primaryExercise = exercises[0]
  const totalSets = exercises.reduce((sum, e) => sum + e.targetSets, 0)
  const totalReps = exercises.reduce((sum, e) => sum + e.targetSets * e.targetReps, 0)
  const averageReps = Math.ceil(totalReps / Math.max(1, totalSets))
  const serializedRoutine = JSON.stringify(exercises)

  const dbExerciseType =
    primaryExercise.exerciseType === 'leg_raise' ? 'squat' : primaryExercise.exerciseType

  let created: ChallengeRow
  try {
    ;[created] = await db
      .insert(challenge)
      .values({
        userId: sessionUser.id,
        exerciseType: dbExerciseType,
        customGesture: primaryExercise.customGesture ?? null,
        targetReps: averageReps,
        targetSets: totalSets,
        dailyStakeAmount: data.dailyStakeAmount,
        totalDays: data.totalDays,
        totalCommitmentAmount: total,
        status: 'pending_charge',
        startDayOffset: data.startDayOffset,
        timezone: data.timezone,
        kelviqCustomerId: serializedRoutine,
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
}

export async function startChallengeCheckoutImpl() {
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

export async function getDashboardImpl(): Promise<DashboardView> {
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

  let routine: RoutineExercise[] = []
  if (challengeRow.kelviqCustomerId) {
    try {
      const parsed = JSON.parse(challengeRow.kelviqCustomerId)
      if (Array.isArray(parsed) && parsed.length > 0) {
        routine = parsed
      }
    } catch {
      // not JSON
    }
  }
  if (routine.length === 0) {
    routine = [
      {
        exerciseType: challengeRow.exerciseType,
        customGesture: challengeRow.customGesture ?? null,
        targetSets: challengeRow.targetSets,
        targetReps: challengeRow.targetReps,
      },
    ]
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
    routine,
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

  // Lazy settlement check: if challenge is active and all days are resolved or final deadline passed
  if (challengeRow.status === 'active') {
    try {
      const settleResult = await settleChallenge(challengeRow.id, now)
      if (settleResult === 'settled' || settleResult === 'refunded') {
        const updated = await db.query.challenge.findFirst({
          where: eq(challenge.id, challengeRow.id),
        })
        if (updated) {
          challengeView.status = updated.status
          challengeView.settlementStatus = updated.settlementStatus
        }
      }
    } catch (err) {
      console.error('[dashboard] lazy settlement failed:', err)
    }
  }

  const daysView: DashboardView['days'] = derived.map((d) => ({
    dayNumber: d.row.dayNumber,
    localDate: d.row.localDate,
    status: d.status,
    windowStartUtc: d.row.windowStartUtc.toISOString(),
    windowEndUtc: d.row.windowEndUtc.toISOString(),
    completedAt: d.row.completedAt ? d.row.completedAt.toISOString() : null,
  }))

  return { challenge: challengeView, days: daysView, totals } satisfies DashboardView
}

export async function startWorkoutImpl(data: { dayNumber: number }) {
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
}

export async function completeDayImpl(data: {
  dayNumber: number
  setsCompleted: number
  totalReps: number
  confidence: number
  sessionToken: string
}) {
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

  let routine: RoutineExercise[] = []
  if (challengeRow.kelviqCustomerId) {
    try {
      const parsed = JSON.parse(challengeRow.kelviqCustomerId)
      if (Array.isArray(parsed) && parsed.length > 0) routine = parsed
    } catch {
      // ignore
    }
  }

  const expectedSets =
    routine.length > 0 ? routine.reduce((sum, e) => sum + e.targetSets, 0) : challengeRow.targetSets
  const expectedReps =
    routine.length > 0
      ? routine.reduce((sum, e) => sum + e.targetSets * e.targetReps, 0)
      : challengeRow.targetSets * challengeRow.targetReps

  if (data.setsCompleted < expectedSets) {
    throw new Error(
      `Completed sets (${data.setsCompleted}) do not match the target (${expectedSets}).`,
    )
  }
  if (data.totalReps < expectedReps) {
    throw new Error(`Completed reps (${data.totalReps}) are below the target (${expectedReps}).`)
  }

  const nowMs = Date.now()
  const elapsedMs = nowMs - tokenPayload.startedAtMs
  const minDurationSeconds = Math.ceil(expectedReps * MIN_SECONDS_PER_REP)
  const durationSeconds = Math.floor(elapsedMs / 1000)
  if (elapsedMs < minDurationSeconds * 1000) {
    throw new Error(`Session too short for ${expectedReps} reps (minimum ${minDurationSeconds}s).`)
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

  const exerciseSummary =
    routine.length > 1 ? routine.map((r) => r.exerciseType).join('+') : challengeRow.exerciseType

  await db.transaction(async (tx) => {
    await tx.insert(workoutVerification).values({
      challengeId: challengeRow.id,
      dayNumber: data.dayNumber,
      exercise: exerciseSummary,
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

  // Immediate settlement if this was the final day of the challenge
  if (data.dayNumber === challengeRow.totalDays) {
    try {
      await settleChallenge(challengeRow.id, now)
    } catch (err) {
      console.error('[challenge] immediate settlement on final day failed:', err)
    }
  }

  return { ok: true as const, dayNumber: data.dayNumber }
}

export async function updateRoutineImpl(newRoutine: RoutineExercise[]) {
  const session = await ensureSession()
  const sessionUser = session.user as SessionUser

  const active = await db.query.challenge.findFirst({
    where: and(eq(challenge.userId, sessionUser.id), inArray(challenge.status, [...ACTIVE_STATES])),
    orderBy: desc(challenge.createdAt),
  })

  if (!active) {
    throw new Error('No active challenge found to update.')
  }

  const serialized = JSON.stringify(newRoutine)
  await db
    .update(challenge)
    .set({ kelviqCustomerId: serialized })
    .where(eq(challenge.id, active.id))

  return { success: true, routine: newRoutine }
}
