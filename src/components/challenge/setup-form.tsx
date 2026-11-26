import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { createChallenge } from '#/lib/server/challenges'
import { CUSTOM_GESTURE_LABELS } from '#/lib/challenge'
import type { CustomGesture, ExerciseType } from '#/lib/challenge'
import { formatUSD } from '#/lib/format'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import { ArrowRight, Check, Plus, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { ExerciseDrawer, EXERCISE_CATALOG } from './exercise-drawer'
import type { CatalogExerciseItem } from './exercise-drawer'
import { ExerciseMascot } from './exercise-mascots'
import { cn } from '#/lib/utils'

const DURATION_PRESETS = [
  { label: '7 Days', days: 7, subtitle: 'Quick Sprint', badge: 'Reset' },
  { label: '30 Days', days: 30, subtitle: '1 Month', badge: 'Habit Lock-In' },
  { label: '6 Months', days: 180, subtitle: '180 Days', badge: 'Transformation' },
  { label: '12 Months', days: 365, subtitle: '1 Year', badge: 'Fit Body Guarantee' },
]

const STAKE_PRESETS = [5, 10, 20, 50]

const exerciseItemSchema = z.object({
  enabled: z.boolean(),
  exerciseType: z.enum(['squat', 'push_up', 'jumping_jack', 'custom_gesture', 'leg_raise']),
  customGesture: z.enum(['pinch', 'fist', 'open_hand']).nullable().optional(),
  targetSets: z.number().int().min(1).max(20),
  targetReps: z.number().int().min(1).max(500),
})

const setupSchema = z
  .object({
    totalDays: z.number().int().min(1).max(365),
    dailyStakeAmount: z.number().int().min(1).max(10_000),
    exercises: z.array(exerciseItemSchema),
    startDayOffset: z.enum(['0', '1']).transform((value) => (value === '1' ? 1 : 0)),
  })
  .refine((data) => data.exercises.some((e) => e.enabled), {
    message: 'Please choose at least 1 exercise for your daily workout.',
    path: ['exercises'],
  })

type SetupInput = z.input<typeof setupSchema>
type SetupValues = z.output<typeof setupSchema>

const LATE_HOUR = 20

export function SetupForm() {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const late = new Date().getHours() >= LATE_HOUR

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SetupInput, unknown, SetupValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      totalDays: 30,
      dailyStakeAmount: 10,
      startDayOffset: late ? '1' : '0',
      exercises: EXERCISE_CATALOG.map((item) => ({
        enabled: item.type === 'push_up' || item.type === 'leg_raise',
        exerciseType: item.type,
        customGesture: item.type === 'custom_gesture' ? 'pinch' : null,
        targetSets: item.defaultSets,
        targetReps: item.defaultReps,
      })),
    },
  })

  const totalDays = watch('totalDays') || 30
  const dailyStake = watch('dailyStakeAmount') || 10
  const exercises = watch('exercises')
  const total = dailyStake * totalDays

  const activeExercises = exercises.filter((e) => e.enabled)

  // Label for duration summary
  const durationLabel =
    totalDays === 7
      ? '7 days'
      : totalDays === 30
        ? '30 days'
        : totalDays === 180
          ? '6 months'
          : totalDays === 365
            ? '12 months'
            : `${totalDays} days`

  const handleToggleExerciseFromDrawer = (cat: CatalogExerciseItem) => {
    const idx = exercises.findIndex((e) => e.exerciseType === cat.type)
    if (idx !== -1) {
      const currentVal = exercises[idx].enabled
      setValue(`exercises.${idx}.enabled` as const, !currentVal, { shouldValidate: true })
    }
  }

  const handleUpdateExerciseFromDrawer = (
    type: ExerciseType,
    sets: number,
    reps: number,
    gesture?: CustomGesture | null,
  ) => {
    const idx = exercises.findIndex((e) => e.exerciseType === type)
    if (idx !== -1) {
      setValue(`exercises.${idx}.targetSets` as const, sets)
      setValue(`exercises.${idx}.targetReps` as const, reps)
      if (gesture !== undefined) {
        setValue(`exercises.${idx}.customGesture` as const, gesture)
      }
    }
  }

  async function onSubmit(values: SetupValues) {
    setSubmitError(null)
    const timezone =
      typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'

    const selectedExercises = values.exercises
      .filter((e) => e.enabled)
      .map((e) => ({
        exerciseType: e.exerciseType,
        customGesture: e.exerciseType === 'custom_gesture' ? (e.customGesture ?? 'pinch') : null,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
      }))

    if (selectedExercises.length === 0) {
      setSubmitError('Please choose at least 1 exercise.')
      return
    }

    try {
      localStorage.setItem('stakefit:active-routine', JSON.stringify(selectedExercises))
    } catch {
      // ignore
    }

    try {
      const result = await createChallenge({
        data: {
          exercises: selectedExercises,
          exerciseType: selectedExercises[0].exerciseType,
          customGesture: selectedExercises[0].customGesture ?? null,
          targetSets: selectedExercises.reduce((sum, e) => sum + e.targetSets, 0),
          targetReps: selectedExercises[0].targetReps,
          dailyStakeAmount: values.dailyStakeAmount,
          totalDays: values.totalDays,
          startDayOffset: values.startDayOffset === 1 ? 1 : 0,
          timezone,
        },
      })
      window.location.href = result.checkoutUrl
    } catch (error) {
      console.error('[setup] createChallenge failed:', error)
      setSubmitError((error as Error).message)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-7 pt-1">
        {/* Step 1: Duration Horizon */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[0.7rem] font-bold uppercase tracking-wider text-[#2b66f2]">
                Step 01
              </span>
              <h2 className="font-display text-lg font-bold text-[#0d1b2a] sm:text-xl">
                How long do you want to be consistent?
              </h2>
            </div>
            <span className="rounded-full bg-[#2b66f2]/10 px-2.5 py-0.5 font-mono text-xs font-bold text-[#2b66f2]">
              {totalDays} days
            </span>
          </div>

          {/* Compact 4-Tile Duration Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {DURATION_PRESETS.map((preset) => {
              const isSelected = totalDays === preset.days
              return (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => setValue('totalDays', preset.days, { shouldValidate: true })}
                  className={cn(
                    'relative flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all cursor-pointer active:scale-98',
                    isSelected
                      ? 'border-[#2b66f2] bg-[#2b66f2]/8 shadow-xs ring-1 ring-[#2b66f2]'
                      : 'border-[#0d1b2a14] bg-white/70 hover:bg-white hover:border-[#0d1b2a24]',
                  )}
                >
                  <span className="rounded-full bg-[#eef3fb] px-2 py-0.5 text-[0.65rem] font-bold text-[#2b66f2]">
                    {preset.badge}
                  </span>
                  <p className="mt-2 font-display text-base font-bold text-[#0d1b2a] leading-tight">
                    {preset.label}
                  </p>
                  <p className="text-[0.7rem] text-[#5a6678]">{preset.subtitle}</p>
                  {isSelected ? (
                    <span className="absolute top-2.5 right-2.5 grid size-4.5 place-items-center rounded-full bg-[#2b66f2] text-white">
                      <Check className="size-3 stroke-[3]" />
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {/* Subtle Inline Custom Duration */}
          <div className="flex items-center gap-2 pt-0.5 text-xs text-[#5a6678]">
            <span className="font-semibold">Or custom duration:</span>
            <div className="relative flex items-center w-20">
              <Input
                id="customDuration"
                type="number"
                min={1}
                max={365}
                {...register('totalDays', { valueAsNumber: true })}
                className="h-7.5 px-2 text-center text-xs font-mono font-bold bg-white/80 border-[#0d1b2a18]"
              />
            </div>
            <span>days (1–365)</span>
          </div>
          {errors.totalDays ? (
            <p role="alert" className="text-xs font-semibold text-rose-600">
              {errors.totalDays.message}
            </p>
          ) : null}
        </section>

        {/* Divider Separator */}
        <div className="border-t border-[#0d1b2a12]" />

        {/* Step 2: Daily Stake */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[0.7rem] font-bold uppercase tracking-wider text-[#2b66f2]">
                Step 02
              </span>
              <h2 className="font-display text-lg font-bold text-[#0d1b2a] sm:text-xl">
                How much can you stake daily on yourself?
              </h2>
              <p className="text-xs text-[#5a6678]">
                An amount at risk each day you don&apos;t record your workout.
              </p>
            </div>
            <span className="font-mono text-sm font-bold text-[#2b66f2] bg-[#2b66f2]/10 px-3 py-1 rounded-full">
              {formatUSD(dailyStake)} / day
            </span>
          </div>

          {/* Integrated Inline Amount Picker */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {STAKE_PRESETS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setValue('dailyStakeAmount', val, { shouldValidate: true })}
                className={cn(
                  'rounded-xl border px-3.5 py-1.5 font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95',
                  dailyStake === val
                    ? 'border-[#2b66f2] bg-[#2b66f2] text-white shadow-xs'
                    : 'border-[#0d1b2a14] bg-white/70 hover:bg-white text-[#0d1b2a]',
                )}
              >
                ${val}
              </button>
            ))}

            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center w-24">
                <span className="absolute left-2.5 text-xs font-bold text-[#5a6678] pointer-events-none">
                  $
                </span>
                <Input
                  id="dailyStakeInput"
                  type="number"
                  min={1}
                  max={10000}
                  placeholder="Custom"
                  className="h-8.5 pl-6 pr-2 text-xs font-mono font-bold bg-white/80 border-[#0d1b2a18]"
                  {...register('dailyStakeAmount', { valueAsNumber: true })}
                />
              </div>
              <span className="text-xs font-semibold text-[#5a6678]">/ day</span>
            </div>
          </div>
          {errors.dailyStakeAmount ? (
            <p role="alert" className="text-xs font-semibold text-rose-600">
              {errors.dailyStakeAmount.message}
            </p>
          ) : null}
        </section>

        {/* Divider Separator */}
        <div className="border-t border-[#0d1b2a12]" />

        {/* Step 3: Exercise Routine */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[0.7rem] font-bold uppercase tracking-wider text-[#2b66f2]">
                Step 03
              </span>
              <h2 className="font-display text-lg font-bold text-[#0d1b2a] sm:text-xl">
                Choose exercises you want to perform daily
              </h2>
              <p className="text-xs text-[#5a6678]">
                Your camera tracks each exercise sequentially in real time.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-800">
              {activeExercises.length} in routine
            </span>
          </div>

          {errors.exercises ? (
            <p
              role="alert"
              className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200"
            >
              {errors.exercises.message}
            </p>
          ) : null}

          {/* Compact Active Routine Rows */}
          <div className="space-y-2 pt-0.5">
            {EXERCISE_CATALOG.map((cat, idx) => {
              const isEnabled = exercises[idx]?.enabled ?? false
              if (!isEnabled) return null

              return (
                <div
                  key={cat.type}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border border-[#0d1b2a14] bg-white/70 hover:bg-white transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-13 rounded-xl border border-[#0d1b2a10] bg-white p-1 grid place-items-center shrink-0">
                      <ExerciseMascot type={cat.type} className="size-full" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-sm sm:text-base font-bold text-[#0d1b2a] truncate">
                          {cat.name}
                        </h3>
                        <span className="rounded-full bg-[#eef3fb] px-1.5 py-0.2 text-[0.6rem] font-bold text-[#2b66f2]">
                          Camera Verified
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {cat.tags.map((tag) => {
                          const isLowerAbs = tag.toLowerCase() === 'lower abs'
                          return (
                            <span
                              key={tag}
                              className={cn(
                                'rounded-md px-1.5 py-0.2 text-[0.62rem] font-bold uppercase tracking-wider',
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
                    </div>
                  </div>

                  {/* Compact Sets & Reps Inputs + Remove */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#0d1b2a08]">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1">
                        <Input
                          id={`sets-${idx}`}
                          type="number"
                          min={1}
                          max={20}
                          aria-label={`${cat.name} sets`}
                          {...register(`exercises.${idx}.targetSets` as const, {
                            valueAsNumber: true,
                          })}
                          className="h-7.5 w-12 px-1 text-center text-xs font-mono font-bold bg-white border-[#0d1b2a18]"
                        />
                        <span className="text-[0.7rem] font-bold text-[#5a6678]">sets</span>
                      </div>
                      <span className="text-[#0d1b2a20]">×</span>
                      <div className="flex items-center gap-1">
                        <Input
                          id={`reps-${idx}`}
                          type="number"
                          min={1}
                          max={500}
                          aria-label={`${cat.name} reps`}
                          {...register(`exercises.${idx}.targetReps` as const, {
                            valueAsNumber: true,
                          })}
                          className="h-7.5 w-14 px-1 text-center text-xs font-mono font-bold bg-white border-[#0d1b2a18]"
                        />
                        <span className="text-[0.7rem] font-bold text-[#5a6678]">
                          {cat.repsUnit}
                        </span>
                      </div>

                      {cat.type === 'custom_gesture' ? (
                        <select
                          className="h-7.5 rounded-xl border border-[#0d1b2a18] bg-white px-1.5 text-[0.7rem] font-semibold text-[#0d1b2a]"
                          {...register(`exercises.${idx}.customGesture` as const)}
                        >
                          {Object.entries(CUSTOM_GESTURE_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setValue(`exercises.${idx}.enabled` as const, false, {
                          shouldValidate: true,
                        })
                      }
                      className="p-1.5 rounded-lg text-[#5a6678] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove exercise"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Plus Button to Open Bottom Drawer */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#2b66f2]/30 bg-white/40 hover:bg-white hover:border-[#2b66f2] py-3 px-4 text-xs sm:text-sm font-bold text-[#2b66f2] transition-all cursor-pointer active:scale-98"
          >
            <Plus className="size-4 stroke-[2.5] group-hover:scale-110 transition-transform" />
            <span>Add Movements from Exercise Pool</span>
          </button>
        </section>

        {/* Divider Separator */}
        <div className="border-t border-[#0d1b2a12]" />

        {/* Step 4: Commitment Review & Escrow Deposit */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid size-5.5 place-items-center rounded-full bg-[#2b66f2] text-white">
                <Sparkles className="size-3" />
              </span>
              <h2 className="font-display text-base font-bold text-[#0d1b2a] sm:text-lg">
                Commitment Summary & Guarantee
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="size-3.5" /> 100% Refundable
            </div>
          </div>

          {/* User-Requested Exact Statement */}
          <div className="rounded-2xl border border-[#0d1b2a14] bg-white/70 p-4 sm:p-5 space-y-2.5 shadow-2xs">
            <p className="text-sm sm:text-base font-bold text-[#0d1b2a] leading-relaxed">
              You are betting{' '}
              <span className="font-mono text-[#2b66f2]">{formatUSD(dailyStake)}</span> daily for{' '}
              <span className="font-mono text-[#2b66f2]">{totalDays} days</span>. Each day you fail
              to record yourself doing your exercises, you will lose{' '}
              <span className="font-mono text-rose-600">{formatUSD(dailyStake)}</span>. All the
              amounts you earn will get refunded to you at the end of{' '}
              <span className="text-[#0d1b2a] underline decoration-[#2b66f2] underline-offset-4">
                {durationLabel}
              </span>
              .
            </p>

            {/* Daily Exercise Sequence */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[#0d1b2a0a]">
              <span className="text-[0.65rem] font-bold text-[#5a6678] uppercase tracking-wider">
                Daily Sequence:
              </span>
              {activeExercises.map((e, i) => {
                const cat = EXERCISE_CATALOG.find((c) => c.type === e.exerciseType)
                return (
                  <span
                    key={e.exerciseType}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#eef3fb] px-2 py-0.5 font-mono text-[0.7rem] font-bold text-[#2b66f2]"
                  >
                    <span>{i + 1}.</span>
                    <span>
                      {cat?.name}: {e.targetSets}×{e.targetReps}
                    </span>
                  </span>
                )
              })}
            </div>
          </div>

          {/* Escrow Pot Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
            <div>
              <span className="text-[0.7rem] font-bold uppercase tracking-wider text-emerald-800">
                Total Upfront Deposit (Refundable Escrow)
              </span>
              <p className="mt-0.5 font-mono text-2xl sm:text-3xl font-extrabold text-[#0d1b2a]">
                {formatUSD(total)}
              </p>
              <p className="text-[0.7rem] text-emerald-800">
                {formatUSD(dailyStake)} × {totalDays} days in secure vault. 100% refunded when you
                honor your commitment.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 shrink-0">
              <Check className="size-4" /> 100% Money-Back Guarantee
            </div>
          </div>

          {/* Start Date Offset Radios */}
          <div className="space-y-1.5">
            <Label className="text-[0.7rem] font-bold text-[#5a6678] uppercase tracking-wider">
              Start Date
            </Label>
            <div className="grid grid-cols-2 gap-2.5 max-w-xs">
              <label className="flex items-center gap-2 rounded-xl border border-[#0d1b2a14] bg-white/70 p-2.5 cursor-pointer hover:border-[#2b66f2]/50">
                <input
                  type="radio"
                  value="0"
                  className="accent-[#2b66f2] size-3.5 cursor-pointer"
                  {...register('startDayOffset')}
                />
                <span className="text-xs font-bold text-[#0d1b2a]">Start Today</span>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-[#0d1b2a14] bg-white/70 p-2.5 cursor-pointer hover:border-[#2b66f2]/50">
                <input
                  type="radio"
                  value="1"
                  className="accent-[#2b66f2] size-3.5 cursor-pointer"
                  {...register('startDayOffset')}
                />
                <span className="text-xs font-bold text-[#0d1b2a]">Start Tomorrow</span>
              </label>
            </div>
            {late ? (
              <p className="text-xs font-medium text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">
                It is past 8:00 PM in your timezone. Starting tomorrow gives you a full day.
              </p>
            ) : null}
          </div>

          {submitError ? (
            <p
              role="alert"
              className="rounded-2xl border border-rose-500/20 bg-rose-50 p-3.5 text-center text-xs font-semibold text-rose-700"
            >
              {submitError}
            </p>
          ) : null}

          {/* Checkout CTA */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full py-3.5 text-base shadow-sm flex items-center justify-center gap-2 font-bold cursor-pointer"
            disabled={isSubmitting || activeExercises.length === 0}
          >
            Lock In Commitment & Deposit {formatUSD(total)} <ArrowRight className="size-4" />
          </Button>
        </section>
      </form>

      {/* Bottom Movement Pool Drawer */}
      <ExerciseDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        routine={activeExercises.map((e) => ({
          exerciseType: e.exerciseType,
          customGesture: e.customGesture,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
        }))}
        onToggleExercise={handleToggleExerciseFromDrawer}
        onUpdateExercise={handleUpdateExerciseFromDrawer}
      />
    </>
  )
}
