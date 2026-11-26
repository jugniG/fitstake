import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { createChallenge } from '#/lib/server/challenges'
import { CUSTOM_GESTURE_LABELS } from '#/lib/challenge'
import type { ExerciseType } from '#/lib/challenge'
import { formatUSD } from '#/lib/format'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import { ArrowRight, Check, ShieldCheck, Sparkles } from 'lucide-react'

const DURATION_PRESETS = [
  { label: '7 Days', days: 7, subtitle: 'Quick Sprint', badge: 'Reset' },
  { label: '30 Days', days: 30, subtitle: '1 Month', badge: 'Habit Lock-In' },
  { label: '6 Months', days: 180, subtitle: '180 Days', badge: 'Transformation' },
  { label: '12 Months', days: 365, subtitle: '1 Year', badge: 'Fit Body Guarantee' },
]

const STAKE_PRESETS = [5, 10, 20, 50]

const EXERCISE_CATALOG: Array<{
  type: ExerciseType
  name: string
  description: string
  defaultSets: number
  defaultReps: number
  repsUnit: string
}> = [
  {
    type: 'push_up',
    name: 'Chest Push-Ups',
    description: 'Chest, shoulders & core. Camera checks chest-to-floor depth.',
    defaultSets: 3,
    defaultReps: 10,
    repsUnit: 'reps',
  },
  {
    type: 'squat',
    name: 'Deep Squats',
    description: 'Quad, glute & hamstring power. Camera checks parallel thigh angle.',
    defaultSets: 3,
    defaultReps: 15,
    repsUnit: 'reps',
  },
  {
    type: 'jumping_jack',
    name: 'Jumping Jacks',
    description: 'Cardiovascular conditioning. Camera checks overhead arm reach.',
    defaultSets: 3,
    defaultReps: 20,
    repsUnit: 'reps',
  },
  {
    type: 'custom_gesture',
    name: 'Desk Hand Gestures',
    description: 'Office / sedentary friendly. Camera tracks optical hand landmarks.',
    defaultSets: 3,
    defaultReps: 15,
    repsUnit: 'gestures',
  },
]

const exerciseItemSchema = z.object({
  enabled: z.boolean(),
  exerciseType: z.enum(['squat', 'push_up', 'jumping_jack', 'custom_gesture']),
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
        enabled: item.type === 'push_up' || item.type === 'squat',
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

    // Save to local storage for instant browser preview and reliability
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {/* Unified Commitment Builder Container */}
      <div className="overflow-hidden rounded-3xl border border-[#0d1b2a14] bg-white shadow-xs">
        {/* Live Overview Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#0d1b2a10] bg-[#faf8f5]/80 px-6 py-3.5 sm:px-8">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#0d1b2a]">
              Commitment Terms
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono font-bold text-[#5a6678]">
            <span>{totalDays}d</span>
            <span className="text-[#0d1b2a20]">/</span>
            <span>{formatUSD(dailyStake)}/day</span>
            <span className="text-[#0d1b2a20]">/</span>
            <span>{activeExercises.length} movements</span>
            <span className="text-[#0d1b2a20]">/</span>
            <span className="text-[#2b66f2]">Pot: {formatUSD(total)}</span>
          </div>
        </div>

        {/* Section 1: Duration */}
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-full bg-[#2b66f2]/10 font-mono text-xs font-bold text-[#2b66f2]">
                1
              </span>
              <h2 className="font-display text-lg font-bold text-[#0d1b2a] sm:text-xl">
                How long do you want to be consistent?
              </h2>
            </div>
            <span className="self-start sm:self-auto rounded-full bg-[#eef3fb] px-3 py-1 font-mono text-xs font-bold text-[#2b66f2]">
              {totalDays} Days Selected
            </span>
          </div>

          {/* Preset Duration Tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-1">
            {DURATION_PRESETS.map((preset) => {
              const isSelected = totalDays === preset.days
              return (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => setValue('totalDays', preset.days, { shouldValidate: true })}
                  className={`relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all duration-200 active:scale-98 cursor-pointer ${
                    isSelected
                      ? 'border-[#2b66f2] bg-[#2b66f2]/5 shadow-xs ring-1 ring-[#2b66f2]'
                      : 'border-[#0d1b2a14] bg-white hover:border-[#2b66f2]/40 hover:bg-[#faf8f5]'
                  }`}
                >
                  <span className="rounded-full bg-[#eef3fb] px-2 py-0.5 text-[0.65rem] font-bold text-[#2b66f2]">
                    {preset.badge}
                  </span>
                  <p className="mt-3 font-display text-base font-bold text-[#0d1b2a] sm:text-lg">
                    {preset.label}
                  </p>
                  <p className="text-xs text-[#5a6678]">{preset.subtitle}</p>
                  {isSelected ? (
                    <span className="absolute top-3 right-3 grid size-5 place-items-center rounded-full bg-[#2b66f2] text-white">
                      <Check className="size-3 stroke-[3]" />
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {/* Custom Duration Inline Input */}
          <div className="flex items-center gap-3 pt-1">
            <Label htmlFor="customDuration" className="text-xs text-[#5a6678] font-semibold">
              Or custom duration (1–365 days):
            </Label>
            <div className="w-24">
              <Input
                id="customDuration"
                type="number"
                min={1}
                max={365}
                {...register('totalDays', { valueAsNumber: true })}
                className="h-8 text-xs font-mono font-bold"
              />
            </div>
          </div>
          {errors.totalDays ? (
            <p role="alert" className="text-xs font-semibold text-rose-600">
              {errors.totalDays.message}
            </p>
          ) : null}
        </div>

        {/* Subtle Section Divider */}
        <div className="border-t border-[#0d1b2a10]" />

        {/* Section 2: Daily Stake */}
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-full bg-[#2b66f2]/10 font-mono text-xs font-bold text-[#2b66f2]">
                2
              </span>
              <div>
                <h2 className="font-display text-lg font-bold text-[#0d1b2a] sm:text-xl">
                  How much can you stake daily on yourself?
                </h2>
                <p className="text-xs text-[#5a6678]">
                  Choose an amount that stings enough to guarantee you won&apos;t skip.
                </p>
              </div>
            </div>
            <span className="self-start sm:self-auto font-mono text-base font-bold text-[#2b66f2] bg-[#eef3fb] px-3 py-1 rounded-full">
              {formatUSD(dailyStake)} / day
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Stake Preset Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#5a6678] uppercase tracking-wider mr-1">
                Presets:
              </span>
              {STAKE_PRESETS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setValue('dailyStakeAmount', val, { shouldValidate: true })}
                  className={`rounded-xl border px-3.5 py-1.5 font-mono text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer ${
                    dailyStake === val
                      ? 'border-[#2b66f2] bg-[#2b66f2] text-white shadow-xs'
                      : 'border-[#0d1b2a14] bg-white text-[#0d1b2a] hover:border-[#2b66f2] hover:bg-[#faf8f5]'
                  }`}
                >
                  {formatUSD(val)}
                </button>
              ))}
            </div>

            {/* Custom Input Box */}
            <div className="max-w-xs space-y-1">
              <Label htmlFor="dailyStakeInput" className="text-xs font-bold text-[#5a6678]">
                Custom Daily Amount (USD)
              </Label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-sm font-bold text-[#5a6678] pointer-events-none">
                  $
                </span>
                <Input
                  id="dailyStakeInput"
                  type="number"
                  min={1}
                  max={10000}
                  className="pl-8 text-sm font-mono font-bold"
                  {...register('dailyStakeAmount', { valueAsNumber: true })}
                />
              </div>
              {errors.dailyStakeAmount ? (
                <p role="alert" className="text-xs font-semibold text-rose-600">
                  {errors.dailyStakeAmount.message}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Subtle Section Divider */}
        <div className="border-t border-[#0d1b2a10]" />

        {/* Section 3: Choose Exercises */}
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-full bg-[#2b66f2]/10 font-mono text-xs font-bold text-[#2b66f2]">
                3
              </span>
              <div>
                <h2 className="font-display text-lg font-bold text-[#0d1b2a] sm:text-xl">
                  Choose exercises you want to perform daily
                </h2>
                <p className="text-xs text-[#5a6678]">
                  Select multiple exercises. On workout day, your camera tracks each exercise one by
                  one.
                </p>
              </div>
            </div>
            <span className="self-start sm:self-auto rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 font-mono text-xs font-bold text-emerald-800">
              {activeExercises.length} Selected
            </span>
          </div>

          {errors.exercises ? (
            <p
              role="alert"
              className="text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200"
            >
              {errors.exercises.message}
            </p>
          ) : null}

          {/* Exercises Selection List with Sleek Micro-Card Effects */}
          <div className="space-y-3 pt-1">
            {EXERCISE_CATALOG.map((cat, idx) => {
              const isEnabled = exercises[idx]?.enabled ?? false

              return (
                <div
                  key={cat.type}
                  className={`rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
                    isEnabled
                      ? 'border-[#2b66f2] bg-white shadow-xs ring-1 ring-[#2b66f2]/20'
                      : 'border-[#0d1b2a10] bg-[#faf8f5]/40 hover:border-[#0d1b2a20]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <label className="flex items-start gap-3.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 sm:size-5 rounded-md accent-[#2b66f2] cursor-pointer"
                        {...register(`exercises.${idx}.enabled` as const)}
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-bold text-[#0d1b2a]">
                            {cat.name}
                          </h3>
                          <span className="rounded-full bg-[#eef3fb] px-2 py-0.5 text-[0.65rem] font-bold text-[#2b66f2]">
                            Camera Verified
                          </span>
                        </div>
                        <p className="text-xs text-[#5a6678] mt-0.5">{cat.description}</p>
                      </div>
                    </label>

                    {/* Quick Sets/Reps Summary Pill */}
                    {isEnabled ? (
                      <span className="shrink-0 font-mono text-xs font-bold text-[#2b66f2] bg-[#2b66f2]/10 px-2.5 py-1 rounded-xl">
                        {watch(`exercises.${idx}.targetSets`)} sets ×{' '}
                        {watch(`exercises.${idx}.targetReps`)} {cat.repsUnit}
                      </span>
                    ) : null}
                  </div>

                  {/* Sets & Reps Inputs when Enabled */}
                  {isEnabled ? (
                    <div className="mt-4 border-t border-[#0d1b2a10] pt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label
                          htmlFor={`sets-${idx}`}
                          className="text-[0.7rem] font-bold text-[#5a6678] uppercase tracking-wider"
                        >
                          Sets Per Day
                        </Label>
                        <Input
                          id={`sets-${idx}`}
                          type="number"
                          min={1}
                          max={20}
                          {...register(`exercises.${idx}.targetSets` as const, {
                            valueAsNumber: true,
                          })}
                          className="h-9 text-xs font-mono font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label
                          htmlFor={`reps-${idx}`}
                          className="text-[0.7rem] font-bold text-[#5a6678] uppercase tracking-wider"
                        >
                          Reps Per Set
                        </Label>
                        <Input
                          id={`reps-${idx}`}
                          type="number"
                          min={1}
                          max={500}
                          {...register(`exercises.${idx}.targetReps` as const, {
                            valueAsNumber: true,
                          })}
                          className="h-9 text-xs font-mono font-bold"
                        />
                      </div>

                      {cat.type === 'custom_gesture' ? (
                        <div className="space-y-1 col-span-2 sm:col-span-1">
                          <Label
                            htmlFor={`gesture-${idx}`}
                            className="text-[0.7rem] font-bold text-[#5a6678] uppercase tracking-wider"
                          >
                            Hand Gesture
                          </Label>
                          <select
                            id={`gesture-${idx}`}
                            className="flex h-9 w-full rounded-2xl border border-[#0d1b2a1a] bg-white px-3 text-xs font-semibold text-[#0d1b2a] shadow-xs focus-visible:border-[#2b66f2] focus-visible:outline-none"
                            {...register(`exercises.${idx}.customGesture` as const)}
                          >
                            {Object.entries(CUSTOM_GESTURE_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        {/* Section 4: Summary & Escrow Deposit (Unified Bottom Panel) */}
        <div className="border-t border-[#0d1b2a10] bg-[#faf8f5]/70 p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-[#2b66f2] text-white">
                <Sparkles className="size-3.5" />
              </span>
              <h2 className="font-display text-base font-bold text-[#0d1b2a] sm:text-lg">
                Commitment Summary & Guarantee
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              <ShieldCheck className="size-3.5" /> 100% Refundable
            </div>
          </div>

          {/* User-Requested Exact Statement */}
          <div className="rounded-2xl border border-[#0d1b2a10] bg-white p-5 shadow-xs space-y-3">
            <p className="text-base sm:text-lg font-bold text-[#0d1b2a] leading-relaxed">
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
            <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-[#0d1b2a10]">
              <span className="text-[0.7rem] font-bold text-[#5a6678] uppercase tracking-wider">
                Daily Sequence:
              </span>
              {activeExercises.map((e, i) => {
                const cat = EXERCISE_CATALOG.find((c) => c.type === e.exerciseType)
                return (
                  <span
                    key={e.exerciseType}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#eef3fb] px-2.5 py-1 font-mono text-xs font-bold text-[#2b66f2]"
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

          {/* Escrow Pot Total Box */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Total Upfront Deposit (Refundable Escrow)
              </span>
              <p className="mt-1 font-mono text-3xl font-extrabold text-[#0d1b2a]">
                {formatUSD(total)}
              </p>
              <p className="mt-1 text-xs text-emerald-800">
                {formatUSD(dailyStake)} × {totalDays} days held in secure vault. 100% refunded when
                you honor your commitment.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 shrink-0">
              <Check className="size-4" /> 100% Money-Back Guarantee
            </div>
          </div>

          {/* Start Date Offset Option */}
          <div className="space-y-2 pt-1">
            <Label className="text-xs font-bold text-[#5a6678] uppercase tracking-wider">
              Start Date
            </Label>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <label className="flex items-center gap-2.5 rounded-2xl border border-[#0d1b2a1a] bg-white p-3 cursor-pointer hover:border-[#2b66f2]/50 shadow-xs">
                <input
                  type="radio"
                  value="0"
                  className="accent-[#2b66f2] size-4 cursor-pointer"
                  {...register('startDayOffset')}
                />
                <span className="text-xs font-bold text-[#0d1b2a]">Start Today</span>
              </label>
              <label className="flex items-center gap-2.5 rounded-2xl border border-[#0d1b2a1a] bg-white p-3 cursor-pointer hover:border-[#2b66f2]/50 shadow-xs">
                <input
                  type="radio"
                  value="1"
                  className="accent-[#2b66f2] size-4 cursor-pointer"
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
              className="rounded-2xl border border-rose-500/20 bg-rose-50 p-4 text-center text-xs font-semibold text-rose-700"
            >
              {submitError}
            </p>
          ) : null}

          {/* Checkout Button with Total Amount */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full py-4 text-base shadow-md flex items-center justify-center gap-2 font-bold cursor-pointer"
            disabled={isSubmitting || activeExercises.length === 0}
          >
            Lock In Commitment & Deposit {formatUSD(total)} <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </form>
  )
}
