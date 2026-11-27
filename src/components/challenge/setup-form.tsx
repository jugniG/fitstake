import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { createChallenge } from '#/lib/server/challenges'
import { getSetupConfig, trackSetupCompleted } from '#/lib/server/experiments'
import { CUSTOM_GESTURE_LABELS, consentStatement } from '#/lib/challenge'
import type { CustomGesture, ExerciseType } from '#/lib/challenge'
import { formatUSD } from '#/lib/format'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import { ArrowLeft, ArrowRight, Check, Plus, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { ExerciseDrawer, EXERCISE_CATALOG } from './exercise-drawer'
import type { CatalogExerciseItem } from './exercise-drawer'
import { ExerciseMascot } from './exercise-mascots'
import { clearSetupDraft, exerciseItemSchema, readSetupDraft, saveSetupDraft } from './setup-draft'
import { cn } from '#/lib/utils'

const DURATION_PRESETS = [
  { label: '7 Days', days: 7, subtitle: 'Quick Sprint', badge: 'Reset' },
  { label: '30 Days', days: 30, subtitle: '1 Month', badge: 'Habit Lock-In' },
  { label: '6 Months', days: 180, subtitle: '180 Days', badge: 'Transformation' },
  { label: '12 Months', days: 365, subtitle: '1 Year', badge: 'Fit Body Guarantee' },
]

const STAKE_PRESETS = [5, 10, 20, 50]

const setupSchema = z
  .object({
    totalDays: z.number().int().min(1).max(365),
    dailyStakeAmount: z.number().int().min(1).max(10_000),
    exercises: z.array(exerciseItemSchema),
    startDayOffset: z.enum(['0', '1']).transform((value) => (value === '1' ? 1 : 0)),
    // Required only on the final step for users with a plan; never saved in the draft.
    consentAccepted: z.boolean(),
  })
  .refine((data) => data.exercises.some((e) => e.enabled), {
    message: 'Please choose at least 1 exercise for your daily workout.',
    path: ['exercises'],
  })

type SetupInput = z.input<typeof setupSchema>
type SetupValues = z.output<typeof setupSchema>

const LATE_HOUR = 20

// One question per screen. Fields are validated per screen so a user can't move past a bad
// value; the review screen submits the whole schema.
const STEP_FIELDS = [['totalDays'], ['dailyStakeAmount'], ['exercises'], []] as const
const STEP_COUNT = STEP_FIELDS.length
const LAST_STEP = STEP_COUNT - 1

// Without a plan this is onboarding: the user builds the challenge first, then picks a plan on
// /paywall, then comes back here to agree to the terms and authorize their card.
export function SetupForm({ hasPlan }: { hasPlan: boolean }) {
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const [step, setStep] = useState(0)
  const stepRefs = [
    useRef<HTMLElement>(null),
    useRef<HTMLElement>(null),
    useRef<HTMLElement>(null),
    useRef<HTMLElement>(null),
  ]
  const late = new Date().getHours() >= LATE_HOUR

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    trigger,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SetupInput, unknown, SetupValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      totalDays: 30,
      dailyStakeAmount: 10,
      startDayOffset: late ? '1' : '0',
      consentAccepted: false,
      exercises: EXERCISE_CATALOG.map((item) => ({
        enabled: item.type === 'push_up' || item.type === 'leg_raise',
        exerciseType: item.type,
        customGesture: item.type === 'custom_gesture' ? 'pinch' : null,
        targetSets: item.defaultSets,
        targetReps: item.defaultReps,
      })),
    },
  })

  // localStorage only exists in the browser, so the draft is restored after hydration.
  useEffect(() => {
    const draft = readSetupDraft()
    if (draft) {
      // Consent is never restored: the user must tick it again for the terms on screen.
      reset({ ...draft, consentAccepted: false })
      // Back from the plan checkout: everything is answered, so go straight to the consent step.
      if (hasPlan) setStep(LAST_STEP)
    }
    setDraftRestored(true)

    // Records the exposures for both experiments. The default_stake value only replaces the
    // pre-selected stake for a fresh setup; a saved draft keeps the user's own choice.
    let cancelled = false
    getSetupConfig({ data: { isLateNight: new Date().getHours() >= LATE_HOUR } })
      .then((config) => {
        if (cancelled || draft) return
        setValue('dailyStakeAmount', config.defaultStake, { shouldValidate: true })
      })
      .catch((error: unknown) => {
        // The form already shows the $10 fallback, so the user can carry on.
        console.error('[setup] could not load the experiment config:', error)
      })
    return () => {
      cancelled = true
    }
  }, [reset, hasPlan, setValue])

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    // Move focus to the new question so keyboard and screen-reader users land on it.
    stepRefs[step].current?.focus()
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [step])

  async function goNext() {
    const valid = await trigger([...STEP_FIELDS[step]])
    if (valid) setStep((current) => Math.min(current + 1, LAST_STEP))
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0))
  }

  // Saving starts only after the restore, so the defaults never overwrite a stored draft.
  useEffect(() => {
    if (!draftRestored) return
    const subscription = watch((values) => {
      const parsed = setupSchema.safeParse(values)
      if (!parsed.success) return
      saveSetupDraft({
        totalDays: parsed.data.totalDays,
        dailyStakeAmount: parsed.data.dailyStakeAmount,
        exercises: parsed.data.exercises,
        startDayOffset: parsed.data.startDayOffset === 1 ? '1' : '0',
      })
    })
    return () => subscription.unsubscribe()
  }, [draftRestored, watch])

  const totalDays = watch('totalDays') || 30
  const dailyStake = watch('dailyStakeAmount') || 10
  const exercises = watch('exercises')
  const total = dailyStake * totalDays

  const activeExercises = exercises.filter((e) => e.enabled)

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

    // Finishing the last setup step is the default_stake experiment's early metric. Analytics
    // never blocks the user, so a failure is only logged.
    void trackSetupCompleted().catch((error: unknown) => {
      console.error('[setup] could not record setup_completed:', error)
    })

    if (!hasPlan) {
      saveSetupDraft({
        totalDays: values.totalDays,
        dailyStakeAmount: values.dailyStakeAmount,
        exercises: values.exercises,
        startDayOffset: values.startDayOffset === 1 ? '1' : '0',
      })
      void navigate({ to: '/paywall' })
      return
    }

    if (!values.consentAccepted) {
      setError('consentAccepted', {
        message: 'Tick the box to agree to the charges before authorizing your card.',
      })
      return
    }

    try {
      localStorage.setItem('stakefit:active-routine', JSON.stringify(selectedExercises))
    } catch (error) {
      // Only a local cache for the record screen; the server has the routine.
      console.error('[setup] could not cache the routine locally:', error)
    }

    try {
      const result = await createChallenge({
        data: {
          exercises: selectedExercises,
          dailyStakeAmount: values.dailyStakeAmount,
          totalDays: values.totalDays,
          startDayOffset: values.startDayOffset === 1 ? 1 : 0,
          timezone,
          consentAccepted: true,
        },
      })
      // The challenge now exists server-side; a stale draft would re-open onboarding later.
      clearSetupDraft()
      window.location.href = result.checkoutUrl
    } catch (error) {
      console.error('[setup] createChallenge failed:', error)
      setSubmitError((error as Error).message)
    }
  }

  return (
    <>
      {/* Progress: one question per screen */}
      <div className="mb-8 flex items-center gap-3">
        <div
          role="progressbar"
          aria-label="Setup progress"
          aria-valuemin={1}
          aria-valuemax={STEP_COUNT}
          aria-valuenow={step + 1}
          className="h-3 flex-1 overflow-hidden rounded-full bg-[#0d1b2a14]"
        >
          <div
            className="h-full rounded-full bg-[#2b66f2] motion-safe:transition-[width] motion-safe:duration-300"
            style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
          />
        </div>
        <span className="shrink-0 font-mono text-xs font-bold text-[#5a6678]">
          {step + 1}/{STEP_COUNT}
        </span>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        Question {step + 1} of {STEP_COUNT}
      </p>

      <form
        onSubmit={
          step < LAST_STEP
            ? (event) => {
                // Enter in a number field moves forward instead of submitting the whole setup.
                event.preventDefault()
                void goNext()
              }
            : handleSubmit(onSubmit)
        }
        noValidate
        className="space-y-8"
      >
        {/* Step 1: Duration Horizon */}
        <section
          ref={stepRefs[0]}
          tabIndex={-1}
          className={cn('space-y-4 outline-none', step !== 0 && 'hidden')}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#2b66f2]/10 font-mono text-xs font-bold text-[#2b66f2] ring-1 ring-[#2b66f2]/20">
                1
              </span>
              <div>
                <h2 className="font-display text-lg font-bold text-[#0d1b2a] sm:text-xl">
                  How long do you want to be consistent?
                </h2>
                <p className="mt-0.5 text-xs text-[#5a6678]">
                  Choose your horizon. Consistency is locked day by day.
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-[#2b66f2]/10 px-3 py-1 font-mono text-xs font-bold text-[#2b66f2]">
              {totalDays} Days Selected
            </span>
          </div>

          {/* 4-Tile Duration Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-1">
            {DURATION_PRESETS.map((preset) => {
              const isSelected = totalDays === preset.days
              return (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => setValue('totalDays', preset.days, { shouldValidate: true })}
                  className={cn(
                    'relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all cursor-pointer active:scale-98',
                    isSelected
                      ? 'border-[#2b66f2] bg-white shadow-sm ring-2 ring-[#2b66f2]'
                      : 'border-[#0d1b2a14] bg-white/70 hover:bg-white hover:border-[#0d1b2a24] hover:shadow-2xs',
                  )}
                >
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[0.65rem] font-bold tracking-wide',
                      isSelected
                        ? 'bg-[#2b66f2]/10 text-[#2b66f2]'
                        : 'bg-[#0d1b2a08] text-[#5a6678]',
                    )}
                  >
                    {preset.badge}
                  </span>
                  <p className="mt-2.5 font-display text-base sm:text-lg font-bold text-[#0d1b2a] leading-tight">
                    {preset.label}
                  </p>
                  <p className="mt-0.5 text-[0.72rem] text-[#5a6678]">{preset.subtitle}</p>
                  {isSelected ? (
                    <span className="absolute top-3 right-3 grid size-5 place-items-center rounded-full bg-[#2b66f2] text-white shadow-xs">
                      <Check className="size-3.5 stroke-[3]" />
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {/* Custom Duration Input */}
          <div className="flex items-center gap-2.5 pt-1.5 text-xs text-[#5a6678]">
            <span className="font-semibold uppercase tracking-wider text-[0.7rem] text-[#0d1b2a]">
              Or custom duration:
            </span>
            <div className="relative flex items-center w-24">
              <Input
                id="customDuration"
                type="number"
                min={1}
                max={365}
                {...register('totalDays', { valueAsNumber: true })}
                className="h-8 px-2 text-center text-xs font-mono font-bold bg-white border-[#0d1b2a18] rounded-xl focus:border-[#2b66f2]"
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

        {/* Step 2: Daily Stake */}
        <section
          ref={stepRefs[1]}
          tabIndex={-1}
          className={cn('space-y-4 outline-none', step !== 1 && 'hidden')}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#2b66f2]/10 font-mono text-xs font-bold text-[#2b66f2] ring-1 ring-[#2b66f2]/20">
                2
              </span>
              <div>
                <h2 className="font-display text-lg font-bold text-[#0d1b2a] sm:text-xl">
                  How much can you stake daily on yourself?
                </h2>
                <p className="mt-0.5 text-xs text-[#5a6678]">
                  Choose an amount that stings enough to guarantee you won&apos;t skip.
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-[#2b66f2]/10 px-3 py-1 font-mono text-xs font-bold text-[#2b66f2]">
              {formatUSD(dailyStake)} / day
            </span>
          </div>

          {/* Integrated Presets & Custom Stake Picker */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5a6678] mr-1">
              Presets:
            </span>
            {STAKE_PRESETS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setValue('dailyStakeAmount', val, { shouldValidate: true })}
                className={cn(
                  'rounded-xl px-4 py-2 font-mono text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95',
                  dailyStake === val
                    ? 'border border-[#2b66f2] bg-[#2b66f2] text-white shadow-xs'
                    : 'border border-[#0d1b2a14] bg-white/70 hover:bg-white text-[#0d1b2a] hover:border-[#0d1b2a24]',
                )}
              >
                ${val}
              </button>
            ))}

            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5a6678]">
                Custom:
              </span>
              <div className="relative flex items-center w-28">
                <span className="absolute left-2.5 text-xs font-bold text-[#5a6678] pointer-events-none">
                  $
                </span>
                <Input
                  id="dailyStakeInput"
                  type="number"
                  min={1}
                  max={10000}
                  placeholder="Amount"
                  className="h-8.5 pl-6 pr-2 text-center text-xs font-mono font-bold bg-white border-[#0d1b2a18] rounded-xl focus:border-[#2b66f2]"
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

        {/* Step 3: Exercise Routine */}
        <section
          ref={stepRefs[2]}
          tabIndex={-1}
          className={cn('space-y-4 outline-none', step !== 2 && 'hidden')}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#2b66f2]/10 font-mono text-xs font-bold text-[#2b66f2] ring-1 ring-[#2b66f2]/20">
                3
              </span>
              <div>
                <h2 className="font-display text-lg font-bold text-[#0d1b2a] sm:text-xl">
                  Choose exercises you want to perform daily
                </h2>
                <p className="mt-0.5 text-xs text-[#5a6678]">
                  Pick movements from the pool. On workout day, your camera tracks each exercise
                  sequentially.
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-800">
              {activeExercises.length} in Routine
            </span>
          </div>

          {errors.exercises ? (
            <p
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-600"
            >
              {errors.exercises.message}
            </p>
          ) : null}

          {/* Active Routine Cards */}
          <div className="space-y-2.5 pt-1">
            {EXERCISE_CATALOG.map((cat, idx) => {
              const isEnabled = exercises[idx]?.enabled ?? false
              if (!isEnabled) return null

              return (
                <div
                  key={cat.type}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-[#0d1b2a14] bg-white/70 hover:bg-white transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="size-13 rounded-xl border border-[#0d1b2a10] bg-white p-1 grid place-items-center shrink-0 shadow-2xs">
                      <ExerciseMascot type={cat.type} className="size-full" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-sm sm:text-base font-bold text-[#0d1b2a] truncate">
                          {cat.name}
                        </h3>
                        <span className="rounded-full bg-[#eef3fb] px-2 py-0.2 font-mono text-[0.62rem] font-bold text-[#2b66f2]">
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

                  {/* Compact Sets & Reps Inputs + Remove Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#0d1b2a08]">
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
                          className="h-8 w-13 px-1 text-center text-xs font-mono font-bold bg-white border-[#0d1b2a18] rounded-lg"
                        />
                        <span className="text-[0.7rem] font-bold text-[#5a6678]">sets</span>
                      </div>
                      <span className="text-[#0d1b2a24]">×</span>
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
                          className="h-8 w-15 px-1 text-center text-xs font-mono font-bold bg-white border-[#0d1b2a18] rounded-lg"
                        />
                        <span className="text-[0.7rem] font-bold text-[#5a6678]">
                          {cat.repsUnit}
                        </span>
                      </div>

                      {cat.type === 'custom_gesture' ? (
                        <select
                          className="h-8 rounded-lg border border-[#0d1b2a18] bg-white px-1.5 text-[0.7rem] font-semibold text-[#0d1b2a]"
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
                      <Trash2 className="size-4" />
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
            className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#2b66f2]/30 bg-white/40 hover:bg-white hover:border-[#2b66f2] py-3.5 px-4 text-xs sm:text-sm font-bold text-[#2b66f2] transition-all cursor-pointer active:scale-98 shadow-2xs"
          >
            <Plus className="size-4 stroke-[2.5] group-hover:scale-110 transition-transform" />
            <span>Add Movements from Exercise Pool</span>
          </button>
        </section>

        {step < LAST_STEP ? (
          <div className="flex gap-3">
            {step > 0 ? <PrevButton onClick={goBack} /> : null}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="flex-1 py-4 text-base font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              Next <ArrowRight className="size-4" />
            </Button>
          </div>
        ) : null}

        {/* Step 4: Review, consent and card authorization */}
        <section
          ref={stepRefs[3]}
          tabIndex={-1}
          className={cn('space-y-5 outline-none', step !== 3 && 'hidden')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-[#2b66f2] text-white shadow-xs">
                <Sparkles className="size-3.5" />
              </span>
              <h2 className="font-display text-base font-bold text-[#0d1b2a] sm:text-lg">
                Review your commitment
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <ShieldCheck className="size-3.5" /> Nothing charged today
            </div>
          </div>

          <div className="rounded-2xl border border-[#0d1b2a14] bg-white/70 p-4 sm:p-5 space-y-2.5 shadow-2xs">
            <p className="text-sm sm:text-base font-bold text-[#0d1b2a] leading-relaxed">
              Every day for{' '}
              <span className="text-[#0d1b2a] underline decoration-[#2b66f2] underline-offset-4">
                {durationLabel}
              </span>
              , record your workout on camera before midnight. A completed day costs nothing. Each
              day you miss costs{' '}
              <span className="font-mono text-rose-600">{formatUSD(dailyStake)}</span>.
            </p>

            {/* Daily Exercise Sequence */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#0d1b2a0a]">
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

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <span className="text-[0.7rem] font-bold uppercase tracking-wider text-emerald-800">
                If you show up every day
              </span>
              <p className="mt-0.5 font-mono text-2xl font-extrabold text-[#0d1b2a]">
                {formatUSD(0)}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-500/20 bg-rose-50 p-4">
              <span className="text-[0.7rem] font-bold uppercase tracking-wider text-rose-800">
                The most you can be charged
              </span>
              <p className="mt-0.5 font-mono text-2xl font-extrabold text-[#0d1b2a]">
                {formatUSD(total)}
              </p>
              <p className="text-[0.7rem] text-rose-800">
                {formatUSD(dailyStake)} × {totalDays} days
              </p>
            </div>
          </div>

          {/* Start Date Offset Radios */}
          <div className="space-y-1.5">
            <Label className="text-[0.7rem] font-bold text-[#5a6678] uppercase tracking-wider">
              Start Date
            </Label>
            <div className="grid grid-cols-2 gap-2.5 max-w-xs">
              <label className="flex items-center gap-2 rounded-xl border border-[#0d1b2a14] bg-white/70 p-2.5 cursor-pointer hover:border-[#2b66f2]/50 hover:bg-white transition-all">
                <input
                  type="radio"
                  value="0"
                  className="accent-[#2b66f2] size-3.5 cursor-pointer"
                  {...register('startDayOffset')}
                />
                <span className="text-xs font-bold text-[#0d1b2a]">Start Today</span>
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-[#0d1b2a14] bg-white/70 p-2.5 cursor-pointer hover:border-[#2b66f2]/50 hover:bg-white transition-all">
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

          {hasPlan ? (
            <div className="space-y-1.5">
              <label className="flex items-start gap-3 rounded-2xl border border-[#0d1b2a14] bg-white/70 p-4 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 shrink-0 accent-[#2b66f2] cursor-pointer"
                  aria-describedby={errors.consentAccepted ? 'consent-error' : undefined}
                  {...register('consentAccepted')}
                />
                <span className="text-xs leading-relaxed text-[#0d1b2a]">
                  {consentStatement({ dailyStakeAmount: dailyStake, totalDays })}
                </span>
              </label>
              {errors.consentAccepted ? (
                <p id="consent-error" role="alert" className="text-xs font-semibold text-rose-600">
                  {errors.consentAccepted.message}
                </p>
              ) : null}
            </div>
          ) : null}

          {submitError ? (
            <p
              role="alert"
              className="rounded-2xl border border-rose-500/20 bg-rose-50 p-3.5 text-center text-xs font-semibold text-rose-700"
            >
              {submitError}
            </p>
          ) : null}

          {/* Checkout CTA */}
          <div className="flex gap-3">
            <PrevButton onClick={goBack} />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="flex-1 py-4 text-base shadow-sm flex items-center justify-center gap-2 font-bold cursor-pointer"
              disabled={isSubmitting || activeExercises.length === 0}
            >
              {hasPlan ? <>Authorize card</> : <>Next: choose your plan</>}{' '}
              <ArrowRight className="size-4" />
            </Button>
          </div>
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

function PrevButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={onClick}
      className="py-4 text-base font-bold flex items-center justify-center gap-2 cursor-pointer"
    >
      <ArrowLeft className="size-4" /> Prev
    </Button>
  )
}
