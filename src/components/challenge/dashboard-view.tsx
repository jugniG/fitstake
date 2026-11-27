import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { DashboardView } from '#/lib/server/challenges'
import { EXERCISE_LABELS, CUSTOM_GESTURE_LABELS } from '#/lib/challenge'
import type { ChallengeStatus, CustomGesture, ExerciseType, RoutineExercise } from '#/lib/challenge'
import { formatUSD } from '#/lib/format'
import { resumeMandateCheckout, startUpdateCard, updateRoutine } from '#/lib/server/challenges'
import { MoneySummary } from './money-summary'
import { ChallengeCalendar } from './challenge-calendar'
import { ExerciseDrawer, EXERCISE_CATALOG } from './exercise-drawer'
import type { CatalogExerciseItem } from './exercise-drawer'
import { ExerciseMascot } from './exercise-mascots'
import { Button, buttonStyles } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import {
  Video,
  ArrowRight,
  ShieldCheck,
  Flame,
  CheckCircle2,
  SlidersHorizontal,
  Check,
} from 'lucide-react'
import { cn } from '#/lib/utils'

export function DashboardView({
  data,
  confirmingMandate = false,
}: {
  data: DashboardView
  confirmingMandate?: boolean
}) {
  const { challenge, days, totals } = data
  const lastDecline =
    [...days].reverse().find((d) => d.charge?.declineMessage)?.charge?.declineMessage ?? null

  const [currentRoutine, setCurrentRoutine] = useState<RoutineExercise[]>(() => {
    if (challenge?.routine && challenge.routine.length > 0) {
      return challenge.routine
    }
    if (challenge) {
      return [
        {
          exerciseType: challenge.exerciseType,
          customGesture: challenge.customGesture,
          targetSets: challenge.targetSets,
          targetReps: challenge.targetReps,
        },
      ]
    }
    return []
  })

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [routineSavedToast, setRoutineSavedToast] = useState(false)

  if (!challenge) {
    return (
      <Card className="p-8 text-center sm:p-12">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eef3fb] text-[#2b66f2]">
          <Flame className="size-6 text-[#2b66f2]" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-[#0d1b2a] sm:text-3xl">
          No active commitment.
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[#5a6678]">
          Lock in your workout commitment today. Put real skin in the game and build unbreakable
          consistency.
        </p>
        <div className="mt-6">
          <Link to="/setup" className={buttonStyles({ variant: 'primary', size: 'lg' })}>
            Start a challenge <ArrowRight className="size-4" />
          </Link>
        </div>
      </Card>
    )
  }

  const exerciseLabel =
    challenge.exerciseType === 'custom_gesture'
      ? `${EXERCISE_LABELS.custom_gesture} (${CUSTOM_GESTURE_LABELS[challenge.customGesture ?? 'pinch']})`
      : EXERCISE_LABELS[challenge.exerciseType]
  const hasOpenDay = days.some((day) => day.status === 'pending')
  const canRecord = challenge.status === 'active' || challenge.status === 'mandate_lost'

  const persistRoutine = async (next: RoutineExercise[]) => {
    try {
      localStorage.setItem('stakefit:active-routine', JSON.stringify(next))
      await updateRoutine({ data: { routine: next } })
      setRoutineSavedToast(true)
      window.setTimeout(() => setRoutineSavedToast(false), 2500)
    } catch (err) {
      console.error('[dashboard] failed to persist updated routine:', err)
    }
  }

  const handleToggleExercise = (cat: CatalogExerciseItem) => {
    const exists = currentRoutine.some((r) => r.exerciseType === cat.type)
    let next: RoutineExercise[]
    if (exists) {
      if (currentRoutine.length <= 1) return // Keep at least 1 exercise
      next = currentRoutine.filter((r) => r.exerciseType !== cat.type)
    } else {
      next = [
        ...currentRoutine,
        {
          exerciseType: cat.type,
          customGesture: cat.type === 'custom_gesture' ? 'pinch' : null,
          targetSets: cat.defaultSets,
          targetReps: cat.defaultReps,
        },
      ]
    }
    setCurrentRoutine(next)
    void persistRoutine(next)
  }

  const handleUpdateExercise = (
    type: ExerciseType,
    sets: number,
    reps: number,
    gesture?: CustomGesture | null,
  ) => {
    const next = currentRoutine.map((r) => {
      if (r.exerciseType === type) {
        return {
          ...r,
          targetSets: sets,
          targetReps: reps,
          ...(gesture !== undefined ? { customGesture: gesture } : {}),
        }
      }
      return r
    })
    setCurrentRoutine(next)
    void persistRoutine(next)
  }

  return (
    <div className="space-y-6">
      {/* Active Challenge Header Card */}
      <Card className="p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#0d1b2a10] pb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#5a6678]">
              Active Challenge
            </span>
            <Badge variant={challenge.status === 'active' ? 'success' : 'warning'}>
              {statusLabel(challenge.status)}
            </Badge>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#5a6678]">
            <ShieldCheck className="size-4" /> {formatUSD(challenge.dailyStakeAmount)} per missed
            day
          </span>
        </div>

        <div className="mt-4">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#0d1b2a]">
            {currentRoutine.length > 1 ? 'Daily Multi-Movement Routine' : exerciseLabel}
          </h1>
          {currentRoutine.length > 1 ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {currentRoutine.map((item, idx) => (
                <span
                  key={idx}
                  className="rounded-xl border border-[#0d1b2a14] bg-[#faf8f5] px-3 py-1 font-mono text-xs font-bold text-[#0d1b2a]"
                >
                  {idx + 1}. {EXERCISE_LABELS[item.exerciseType]}: {item.targetSets} sets ×{' '}
                  {item.targetReps} reps
                </span>
              ))}
              <span className="text-xs font-medium text-[#5a6678] ml-1">
                · {challenge.totalDays} days · {formatUSD(challenge.dailyStakeAmount)}/day
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm font-medium text-[#5a6678]">
              {challenge.targetSets} sets × {challenge.targetReps} reps · {challenge.totalDays} days
              · {formatUSD(challenge.dailyStakeAmount)}/day
            </p>
          )}
        </div>

        {canRecord && hasOpenDay ? (
          <div className="mt-6">
            <Link
              to="/record"
              className={buttonStyles({
                variant: 'primary',
                size: 'lg',
                className:
                  'w-full py-4 text-base flex items-center justify-center gap-2 font-bold shadow-md',
              })}
            >
              <Video className="size-5" /> Open Camera & Record Today's Workout
            </Link>
          </div>
        ) : null}

        {canRecord && !hasOpenDay ? (
          <div className="mt-6">
            <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 py-3.5 px-4 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <span>Today's Workout Complete · Next window opens at midnight</span>
            </div>
          </div>
        ) : null}
      </Card>

      {challenge.status === 'pending_mandate' ? (
        <Card className="border-amber-200 bg-amber-50 p-5 text-amber-900">
          <p className="text-sm font-bold" role="status">
            {confirmingMandate ? 'Confirming your card…' : 'Card not authorized yet.'}
          </p>
          <p className="mt-1 text-xs text-amber-800/80">
            {confirmingMandate
              ? 'This page refreshes on its own once Dodo confirms the authorization.'
              : 'Your challenge is saved. Authorize your card to open Day 1. Nothing is charged now.'}
          </p>
          {!confirmingMandate ? <MandateButton label="Authorize card" /> : null}
        </Card>
      ) : null}

      {challenge.status === 'mandate_lost' ? (
        <Card className="border-rose-200 bg-rose-50 p-5 text-rose-900">
          <p className="text-sm font-bold" role="status">
            Your card authorization ended.
          </p>
          <p className="mt-1 text-xs text-rose-800/80">
            Missed days can't be charged until you re-authorize, and you can't start a new
            challenge. You can still record today's workout.
          </p>
          <MandateButton label="Re-authorize card" />
        </Card>
      ) : null}

      {totals.owedAmount > 0 && challenge.status === 'active' ? (
        <Card className="border-rose-200 bg-rose-50 p-5 text-rose-900">
          <p className="text-sm font-bold" role="status">
            {formatUSD(totals.owedAmount)} for missed days is unpaid.
          </p>
          <p className="mt-1 text-xs text-rose-800/80">
            {lastDecline
              ? `Your card was declined: ${lastDecline}. `
              : 'A charge for a missed day did not go through. '}
            Update your card and we'll try again. New challenges are blocked until it's paid.
          </p>
          <UpdateCardButton />
        </Card>
      ) : null}

      <MoneySummary totals={totals} />

      {challenge.status === 'completed' ? (
        <div className="space-y-4">
          <Card className="border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
            <p className="text-sm font-bold">Challenge complete.</p>
            <p className="mt-1 text-xs text-emerald-800">
              {totals.missedDays === 0
                ? `You showed up all ${totals.totalDays} days and paid nothing.`
                : `You completed ${totals.completedDays} of ${totals.totalDays} days. Missed days cost ${formatUSD(totals.chargedAmount)}.`}{' '}
              Your card authorization has been cancelled.
            </p>
          </Card>
          {data.newChallengeBlocker === null ? (
            <Link
              to="/setup"
              className={buttonStyles({ variant: 'primary', className: 'w-full py-3.5' })}
            >
              Start a new challenge
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* User Requested: Interactive Calendar Component with Month Turners & Status on each day */}
      <ChallengeCalendar days={days} dailyStakeAmount={challenge.dailyStakeAmount} />

      {/* User Requested: Below calendar show the set of exercises chosen with Edit option */}
      <Card className="p-6 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#0d1b2a10] pb-4">
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#2b66f2]">
              Daily Movements
            </span>
            <h2 className="mt-0.5 font-display text-xl font-extrabold text-[#0d1b2a] sm:text-2xl">
              Your Chosen Exercises
            </h2>
            <p className="text-xs text-[#5a6678]">
              Tracked sequentially one by one on camera every workout day.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {routineSavedToast ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full animate-fade-in">
                <Check className="size-3.5" /> Saved
              </span>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <SlidersHorizontal className="size-3.5" /> Edit Routine
            </Button>
          </div>
        </div>

        {/* Grid of chosen exercises */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {currentRoutine.map((item, idx) => {
            const cat = EXERCISE_CATALOG.find((c) => c.type === item.exerciseType)
            return (
              <div
                key={item.exerciseType}
                className="flex items-start gap-3.5 rounded-2xl border border-[#0d1b2a14] bg-[#faf8f5]/60 p-4 transition-all hover:border-[#2b66f2]/40 hover:bg-white"
              >
                <div className="size-14 rounded-xl border border-[#0d1b2a10] bg-white p-1 grid place-items-center shrink-0">
                  <ExerciseMascot type={item.exerciseType} className="size-full" />
                </div>
                <div className="min-w-0 space-y-1 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="font-display text-base font-bold text-[#0d1b2a] truncate">
                      {cat?.name ?? EXERCISE_LABELS[item.exerciseType]}
                    </h3>
                    <span className="shrink-0 rounded-full bg-[#eef3fb] px-2 py-0.5 font-mono text-[0.65rem] font-bold text-[#2b66f2]">
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    {cat?.tags.map((tag) => {
                      const isLowerAbs = tag.toLowerCase() === 'lower abs'
                      return (
                        <span
                          key={tag}
                          className={cn(
                            'rounded-md px-1.5 py-0.2 text-[0.6rem] font-bold uppercase tracking-wider',
                            isLowerAbs
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs'
                              : 'bg-[#0d1b2a08] text-[#5a6678]',
                          )}
                        >
                          {tag}
                        </span>
                      )
                    })}
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs font-mono font-bold text-[#0d1b2a]">
                    <span>Target:</span>
                    <span className="text-[#2b66f2] bg-[#2b66f2]/10 px-2 py-0.5 rounded-md">
                      {item.targetSets} sets × {item.targetReps} reps
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Bottom Drawer for Editing Routine */}
      <ExerciseDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        routine={currentRoutine}
        onToggleExercise={handleToggleExercise}
        onUpdateExercise={handleUpdateExercise}
      />
    </div>
  )
}

function RedirectButton({
  label,
  busyLabel,
  logPrefix,
  getUrl,
}: {
  label: string
  busyLabel: string
  logPrefix: string
  getUrl: () => Promise<string>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function go() {
    setBusy(true)
    setError(null)
    try {
      window.location.assign(await getUrl())
    } catch (cause) {
      console.error(`${logPrefix}`, cause)
      setError((cause as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <Button variant="primary" className="w-full" onClick={() => void go()} disabled={busy}>
        {busy ? busyLabel : label}
      </Button>
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function MandateButton({ label }: { label: string }) {
  return (
    <RedirectButton
      label={label}
      busyLabel="Opening Dodo…"
      logPrefix="[dashboard] card authorization failed:"
      getUrl={async () => (await resumeMandateCheckout()).checkoutUrl}
    />
  )
}

function UpdateCardButton() {
  return (
    <RedirectButton
      label="Update card"
      busyLabel="Opening Dodo…"
      logPrefix="[dashboard] card update failed:"
      getUrl={async () => (await startUpdateCard()).url}
    />
  )
}

function statusLabel(status: ChallengeStatus): string {
  switch (status) {
    case 'pending_mandate':
      return 'Card not authorized'
    case 'active':
      return 'In progress'
    case 'mandate_lost':
      return 'Card authorization ended'
    case 'completed':
      return 'Complete'
  }
}
