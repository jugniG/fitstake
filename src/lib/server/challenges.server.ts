import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { db, challenge, day, stakeCharge, workoutVerification } from '#/db.server'
import { ensureSession } from '#/lib/auth.functions'
import { env } from '#/lib/env'
import { newChallengeBlocker } from '#/lib/access'
import type { ChallengeBlocker } from '#/lib/access'
import { createStakeMandateCheckout } from '#/lib/dodo/checkout'
import { createUpdateCardLink } from '#/lib/dodo/charges'
import { ensureDodoCustomer } from '#/lib/dodo/customers'
import { isUniqueViolation } from '#/lib/server/db-errors'
import { resolveAppAccess } from '#/lib/server/access.server'
import { chargeDueDays, finishChallengeIfDone } from '#/lib/server/stake-charges.server'
import { canCompleteDay, computeTotals, consentStatement, currentDayStatus } from '#/lib/challenge'
import {
  createWorkoutSessionToken,
  verifyWorkoutSessionToken,
  WORKOUT_SESSION_MAX_MS,
} from '#/lib/challenge/session-token'
import type { DayWindow, RoutineExercise } from '#/lib/challenge'
import type { CreateChallengeInput, DashboardView } from './challenges'

const LIVE_STATES = ['pending_mandate', 'active', 'mandate_lost'] as const
const RECORDABLE_STATES = ['active', 'mandate_lost'] as const
const UNPAID_CHARGE_STATES = ['failed', 'abandoned'] as const
const MIN_SECONDS_PER_REP = 0.6

type SessionUser = { id: string; email: string; name: string }
type ChallengeRow = typeof challenge.$inferSelect

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

function readRoutine(row: ChallengeRow): RoutineExercise[] {
  if (Array.isArray(row.routine) && row.routine.length > 0) {
    return row.routine as RoutineExercise[]
  }
  return [
    {
      exerciseType: row.exerciseType,
      customGesture: row.customGesture ?? null,
      targetSets: row.targetSets,
      targetReps: row.targetReps,
    },
  ]
}

// Unpaid missed days across every challenge, plus whether any challenge lost its card.
async function readChallengeBlocker(userId: string): Promise<ChallengeBlocker> {
  const [{ reason }, unpaid, lost] = await Promise.all([
    resolveAppAccess(userId),
    db
      .select({ amountCents: stakeCharge.amountCents })
      .from(stakeCharge)
      .innerJoin(challenge, eq(challenge.id, stakeCharge.challengeId))
      .where(
        and(eq(challenge.userId, userId), inArray(stakeCharge.status, [...UNPAID_CHARGE_STATES])),
      ),
    db.query.challenge.findFirst({
      where: and(eq(challenge.userId, userId), eq(challenge.status, 'mandate_lost')),
      columns: { id: true },
    }),
  ])
  const owedAmount = unpaid.reduce((sum, row) => sum + row.amountCents, 0) / 100
  return newChallengeBlocker({ reason, owedAmount, hasLostMandate: !!lost })
}

const BLOCKER_MESSAGES: Record<Exclude<ChallengeBlocker, null>, string> = {
  no_plan: 'Choose a plan to create a new challenge.',
  owes_charges: 'You have unpaid missed days. Update your card on the dashboard first.',
  mandate_lost: 'Your card authorization ended. Re-authorize it on the dashboard first.',
}

async function openMandateCheckout(challengeRow: ChallengeRow, sessionUser: SessionUser) {
  const dodoCustomerId = await ensureDodoCustomer(sessionUser)
  const checkout = await createStakeMandateCheckout({
    userId: sessionUser.id,
    dodoCustomerId,
    challengeId: challengeRow.id,
  })
  await db
    .update(challenge)
    .set({ mandateCheckoutUrl: checkout.checkoutUrl })
    .where(eq(challenge.id, challengeRow.id))
  return checkout.checkoutUrl
}

export async function createChallengeImpl(data: CreateChallengeInput) {
  const session = await ensureSession()
  const sessionUser = session.user as SessionUser

  const existing = await db.query.challenge.findFirst({
    where: and(eq(challenge.userId, sessionUser.id), inArray(challenge.status, [...LIVE_STATES])),
    orderBy: desc(challenge.createdAt),
  })
  if (existing && existing.status !== 'pending_mandate') {
    throw new Error('You already have a running challenge. Finish it first.')
  }

  const blocker = await readChallengeBlocker(sessionUser.id)
  if (blocker) throw new Error(BLOCKER_MESSAGES[blocker])

  // An unfinished authorization is replaced, so the user can change their terms before
  // authorizing. It has no days or charges yet.
  if (existing) {
    await db
      .delete(challenge)
      .where(and(eq(challenge.id, existing.id), eq(challenge.status, 'pending_mandate')))
  }

  const exercises = data.exercises.map((exercise) => ({
    exerciseType: exercise.exerciseType,
    customGesture:
      exercise.exerciseType === 'custom_gesture' ? (exercise.customGesture ?? 'pinch') : null,
    targetSets: exercise.targetSets,
    targetReps: exercise.targetReps,
  }))
  const primary = exercises[0]
  const totalSets = exercises.reduce((sum, e) => sum + e.targetSets, 0)
  const totalReps = exercises.reduce((sum, e) => sum + e.targetSets * e.targetReps, 0)

  let created: ChallengeRow
  try {
    ;[created] = await db
      .insert(challenge)
      .values({
        userId: sessionUser.id,
        exerciseType: primary.exerciseType,
        customGesture: primary.customGesture,
        targetReps: Math.ceil(totalReps / Math.max(1, totalSets)),
        targetSets: totalSets,
        routine: exercises,
        dailyStakeAmount: data.dailyStakeAmount,
        totalDays: data.totalDays,
        status: 'pending_mandate',
        startDayOffset: data.startDayOffset,
        timezone: data.timezone,
        consentText: consentStatement(data),
        consentedAt: new Date(),
      })
      .returning()
  } catch (error) {
    if (isUniqueViolation(error, 'challenge_one_live_per_user')) {
      throw new Error(
        'You already have a challenge in progress. Open the dashboard to continue it.',
      )
    }
    throw error
  }

  try {
    const checkoutUrl = await openMandateCheckout(created, sessionUser)
    return { checkoutUrl, challengeId: created.id }
  } catch (error) {
    console.error('[challenge] could not start the card authorization:', error)
    throw new Error(
      'The card authorization page could not be opened. Your challenge is saved; try again from the dashboard.',
    )
  }
}

// Resumes an unfinished authorization, or re-authorizes a challenge whose card mandate ended.
export async function resumeMandateCheckoutImpl() {
  const session = await ensureSession()
  const sessionUser = session.user as SessionUser
  const existing = await db.query.challenge.findFirst({
    where: and(
      eq(challenge.userId, sessionUser.id),
      inArray(challenge.status, ['pending_mandate', 'mandate_lost']),
    ),
    orderBy: desc(challenge.createdAt),
  })
  if (!existing) throw new Error('There is no card authorization to finish.')
  if (existing.status === 'pending_mandate' && existing.mandateCheckoutUrl) {
    return { checkoutUrl: existing.mandateCheckoutUrl }
  }

  try {
    return { checkoutUrl: await openMandateCheckout(existing, sessionUser) }
  } catch (error) {
    console.error('[challenge] could not resume the card authorization:', error)
    throw new Error('The card authorization page could not be opened. Try again in a moment.')
  }
}

// Hosted Dodo page to replace a declined card; unpaid days are retried once it succeeds.
export async function startUpdateCardImpl() {
  const session = await ensureSession()
  const challengeRow = await db.query.challenge.findFirst({
    where: and(eq(challenge.userId, session.user.id), eq(challenge.status, 'active')),
    orderBy: desc(challenge.createdAt),
  })
  if (!challengeRow?.dodoSubscriptionId) {
    throw new Error('There is no active card authorization to update.')
  }
  try {
    const url = await createUpdateCardLink({
      subscriptionId: challengeRow.dodoSubscriptionId,
      returnUrl: `${env.APP_URL}/dashboard?card=return`,
    })
    return { url }
  } catch (error) {
    console.error('[challenge] could not open the card update page:', error)
    throw new Error('The card update page could not be opened. Try again in a moment.')
  }
}

export async function getDashboardImpl(): Promise<DashboardView> {
  const session = await ensureSession()
  const userId = session.user.id
  const now = new Date()

  const latest = await db.query.challenge.findFirst({
    where: eq(challenge.userId, userId),
    orderBy: desc(challenge.createdAt),
    columns: { id: true, status: true },
  })

  // Opening the app is when missed days are charged. Failures are logged and retried on the
  // next open or by the daily cron; they never block the dashboard.
  if (latest?.status === 'active') {
    try {
      const result = await chargeDueDays(latest.id, now)
      if (result === 'failed') console.error(`[dashboard] charge run failed for ${latest.id}`)
      await finishChallengeIfDone(latest.id, now)
    } catch (error) {
      console.error('[dashboard] charging missed days failed:', error)
    }
  } else if (latest?.status === 'mandate_lost') {
    try {
      await finishChallengeIfDone(latest.id, now)
    } catch (error) {
      console.error('[dashboard] closing a challenge failed:', error)
    }
  }

  const blocker = await readChallengeBlocker(userId)

  const challengeRow = latest
    ? await db.query.challenge.findFirst({
        where: eq(challenge.id, latest.id),
        with: { days: { orderBy: asc(day.dayNumber) }, charges: true },
      })
    : null

  if (!challengeRow) {
    return {
      challenge: null,
      days: [],
      totals: computeTotals({ dailyStakeAmount: 0, totalDays: 0 }, { completed: 0, missed: 0 }, []),
      newChallengeBlocker: blocker,
    }
  }

  const challengeView: NonNullable<DashboardView['challenge']> = {
    id: challengeRow.id,
    exerciseType: challengeRow.exerciseType,
    customGesture: challengeRow.customGesture ?? null,
    targetReps: challengeRow.targetReps,
    targetSets: challengeRow.targetSets,
    dailyStakeAmount: challengeRow.dailyStakeAmount,
    totalDays: challengeRow.totalDays,
    status: challengeRow.status,
    timezone: challengeRow.timezone,
    activatedAt: challengeRow.activatedAt?.toISOString() ?? null,
    startDayOffset: challengeRow.startDayOffset,
    mandateCheckoutUrl: challengeRow.mandateCheckoutUrl,
    consentText: challengeRow.consentText,
    routine: readRoutine(challengeRow),
  }

  const chargesByDay = new Map(challengeRow.charges.map((charge) => [charge.dayNumber, charge]))
  const daysView: DashboardView['days'] = challengeRow.days.map((row) => {
    const charge = chargesByDay.get(row.dayNumber)
    return {
      dayNumber: row.dayNumber,
      localDate: row.localDate,
      status: currentDayStatus(row.status, toDayWindow(row), now),
      windowStartUtc: row.windowStartUtc.toISOString(),
      windowEndUtc: row.windowEndUtc.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      charge: charge
        ? {
            status: charge.status,
            amount: charge.amountCents / 100,
            nextAttemptAt: charge.nextAttemptAt?.toISOString() ?? null,
            declineMessage: charge.lastDeclineMessage,
          }
        : null,
    }
  })

  const totals = computeTotals(
    { dailyStakeAmount: challengeRow.dailyStakeAmount, totalDays: challengeRow.totalDays },
    {
      completed: daysView.filter((d) => d.status === 'completed').length,
      missed: daysView.filter((d) => d.status === 'forfeited').length,
    },
    challengeRow.charges,
  )

  return { challenge: challengeView, days: daysView, totals, newChallengeBlocker: blocker }
}

export async function startWorkoutImpl(data: { dayNumber: number }) {
  const session = await ensureSession()
  const challengeRow = await db.query.challenge.findFirst({
    where: and(
      eq(challenge.userId, session.user.id),
      inArray(challenge.status, [...RECORDABLE_STATES]),
    ),
    with: { days: true },
  })
  if (!challengeRow) throw new Error('No active challenge to record against.')
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET is not set; workouts cannot be verified.')
  }

  const dayRow = challengeRow.days.find((d) => d.dayNumber === data.dayNumber)
  if (!dayRow) throw new Error('Day not found for this challenge.')
  const now = new Date()
  const window = toDayWindow(dayRow)
  const check = canCompleteDay(currentDayStatus(dayRow.status, window, now), window, now)
  if (!check.ok) {
    throw new Error(`Day ${data.dayNumber} is not open for recording (${check.reason}).`)
  }

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
    where: and(eq(challenge.userId, userId), inArray(challenge.status, [...RECORDABLE_STATES])),
    with: { days: true },
  })
  if (!challengeRow) throw new Error('No active challenge to record against.')
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET is not set; workouts cannot be verified.')
  }

  const tokenPayload = verifyWorkoutSessionToken(data.sessionToken, env.BETTER_AUTH_SECRET)
  if (!tokenPayload) {
    throw new Error('The workout session is invalid or has expired. Start a new session.')
  }
  if (
    tokenPayload.userId !== userId ||
    tokenPayload.challengeId !== challengeRow.id ||
    tokenPayload.dayNumber !== data.dayNumber
  ) {
    throw new Error('This workout session does not belong to this day.')
  }

  const routine = readRoutine(challengeRow)
  const expectedSets = routine.reduce((sum, e) => sum + e.targetSets, 0)
  const expectedReps = routine.reduce((sum, e) => sum + e.targetSets * e.targetReps, 0)
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
    // Conditional on the stored status: if the deadline passed and the day was already marked
    // missed (and possibly claimed for a charge), the completion must not win.
    const completed = await tx
      .update(day)
      .set({ status: 'completed', completedAt: now })
      .where(
        and(
          eq(day.challengeId, challengeRow.id),
          eq(day.dayNumber, data.dayNumber),
          inArray(day.status, ['locked', 'pending']),
        ),
      )
      .returning({ id: day.id })
    if (completed.length === 0) {
      throw new Error(`Day ${data.dayNumber} is no longer open; its deadline has passed.`)
    }
    await tx.insert(workoutVerification).values({
      challengeId: challengeRow.id,
      dayNumber: data.dayNumber,
      exercise: exerciseSummary,
      setsCompleted: data.setsCompleted,
      totalReps: data.totalReps,
      confidence: String(data.confidence),
      durationSeconds,
    })
  })

  try {
    await finishChallengeIfDone(challengeRow.id, now)
  } catch (error) {
    console.error('[challenge] closing the challenge after the final day failed:', error)
  }

  return { ok: true as const, dayNumber: data.dayNumber }
}

export async function updateRoutineImpl(newRoutine: RoutineExercise[]) {
  const session = await ensureSession()
  const active = await db.query.challenge.findFirst({
    where: and(eq(challenge.userId, session.user.id), inArray(challenge.status, [...LIVE_STATES])),
    orderBy: desc(challenge.createdAt),
  })
  if (!active) throw new Error('No active challenge found to update.')

  await db.update(challenge).set({ routine: newRoutine }).where(eq(challenge.id, active.id))
  return { success: true, routine: newRoutine }
}
