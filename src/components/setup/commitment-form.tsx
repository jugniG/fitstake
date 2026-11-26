import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCommitment } from '#/lib/commitment-store'
import { formatINR } from '#/lib/format'
import { Button } from '#/components/ui/button'

const setupSchema = z.object({
  dailyAmount: z
    .number({ error: 'Enter a daily amount.' })
    .int('Use whole rupees.')
    .min(1, 'Set at least ₹1 per day.')
    .max(100_000_000, 'This prototype supports up to ₹10,00,00,000 per day.'),
  durationDays: z
    .number({ error: 'Enter a duration.' })
    .int('Use whole days.')
    .min(1, 'Choose at least one day.')
    .max(365, 'This prototype supports up to 365 days.'),
  exercises: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z
          .string()
          .trim()
          .min(1, 'Name this exercise.')
          .max(60, 'Keep the name under 60 characters.'),
        sets: z
          .number({ error: 'Enter sets.' })
          .int('Use whole sets.')
          .min(1, 'At least one set.')
          .max(100, 'This prototype supports up to 100 sets.'),
        reps: z
          .number({ error: 'Enter reps.' })
          .int('Use whole reps.')
          .min(1, 'At least one rep.')
          .max(1_000, 'This prototype supports up to 1,000 reps.'),
      }),
    )
    .min(1, 'Add at least one exercise.')
    .max(20, 'This prototype supports up to 20 exercises.'),
})

type SetupValues = z.infer<typeof setupSchema>

export function CommitmentForm() {
  const navigate = useNavigate()
  const { createPlan } = useCommitment()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [defaultValues] = useState<SetupValues>(createDefaultValues)

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    defaultValues,
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'exercises' })

  const watchedDailyAmount = watch('dailyAmount')
  const watchedDuration = watch('durationDays')
  const watchedExercises = watch('exercises')

  const dailyAmount = Number.isFinite(watchedDailyAmount)
    ? Math.max(0, Math.round(watchedDailyAmount))
    : 0
  const durationDays = Number.isFinite(watchedDuration)
    ? Math.max(0, Math.round(watchedDuration))
    : 0
  const totalAmount = dailyAmount * durationDays
  const exerciseCount = Array.isArray(watchedExercises) ? watchedExercises.length : 0

  const onSubmit = (values: SetupValues) => {
    setSubmitError(null)
    const result = createPlan({
      exercises: values.exercises.map((exercise) => ({
        ...exercise,
        name: exercise.name.trim(),
      })),
      dailyAmount: values.dailyAmount,
      durationDays: values.durationDays,
    })

    if (!result.ok) {
      setSubmitError(result.message)
      return
    }

    navigate({ to: '/dashboard' })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-10">
      <section aria-labelledby="stake-heading" className="space-y-5">
        <SectionHeading
          number="01"
          id="stake-heading"
          title="The stake"
          description="Set one daily allocation. Only that day's amount is at risk."
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="dailyAmount" className="field-label">
              Daily allocation
            </label>
            <div className="field-shell">
              <span aria-hidden="true" className="field-prefix">
                ₹
              </span>
              <input
                id="dailyAmount"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                className="field-input field-input-with-prefix"
                aria-invalid={errors.dailyAmount ? 'true' : 'false'}
                aria-describedby={errors.dailyAmount ? 'dailyAmount-error' : 'dailyAmount-hint'}
                {...register('dailyAmount', { valueAsNumber: true })}
              />
              <span aria-hidden="true" className="field-suffix">
                / day
              </span>
            </div>
            {errors.dailyAmount ? (
              <p id="dailyAmount-error" role="alert" className="field-error">
                {errors.dailyAmount.message}
              </p>
            ) : (
              <p id="dailyAmount-hint" className="field-hint">
                Example ₹1,000. You choose the amount.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="durationDays" className="field-label">
              Ritual length
            </label>
            <div className="field-shell">
              <input
                id="durationDays"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                className="field-input field-input-with-suffix"
                aria-invalid={errors.durationDays ? 'true' : 'false'}
                aria-describedby={errors.durationDays ? 'durationDays-error' : 'durationDays-hint'}
                {...register('durationDays', { valueAsNumber: true })}
              />
              <span aria-hidden="true" className="field-suffix">
                days
              </span>
            </div>
            {errors.durationDays ? (
              <p id="durationDays-error" role="alert" className="field-error">
                {errors.durationDays.message}
              </p>
            ) : (
              <p id="durationDays-hint" className="field-hint">
                Example 10 days. One daily allocation is carved for each day.
              </p>
            )}
          </div>
        </div>

        <div className="border border-line bg-panel/50 px-4 py-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="eyebrow">Demo deposit</span>
            <span className="font-display text-2xl font-medium tabular-nums text-bone">
              {formatINR(totalAmount)}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            {formatINR(dailyAmount)} × {durationDays || 0} days. No payment details are collected
            and no money moves.
          </p>
        </div>
      </section>

      <section aria-labelledby="rites-heading" className="space-y-5">
        <SectionHeading
          number="02"
          id="rites-heading"
          title="The rites"
          description="Choose the movements. Sets and reps are instructions, not proof of completion."
        />

        <div className="space-y-3">
          {fields.map((field, index) => {
            const fieldErrors = errors.exercises?.[index]

            return (
              <div key={field.id} className="border border-line bg-panel/45 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted">
                    Movement {String(index + 1).padStart(2, '0')}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className="icon-action"
                    aria-label={`Remove movement ${index + 1}`}
                    title={fields.length === 1 ? 'Keep at least one exercise' : 'Remove exercise'}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.6} />
                  </button>
                </div>

                <input type="hidden" {...register(`exercises.${index}.id`)} />

                <div>
                  <label htmlFor={`exercise-name-${index}`} className="field-label">
                    Exercise
                  </label>
                  <input
                    id={`exercise-name-${index}`}
                    type="text"
                    maxLength={60}
                    className="field-input"
                    placeholder="e.g. Push-ups"
                    aria-invalid={fieldErrors?.name ? 'true' : 'false'}
                    aria-describedby={
                      fieldErrors?.name ? `exercise-name-error-${index}` : undefined
                    }
                    {...register(`exercises.${index}.name`)}
                  />
                  {fieldErrors?.name ? (
                    <p id={`exercise-name-error-${index}`} role="alert" className="field-error">
                      {fieldErrors.name.message}
                    </p>
                  ) : null}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`exercise-sets-${index}`} className="field-label">
                      Sets
                    </label>
                    <input
                      id={`exercise-sets-${index}`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      className="field-input"
                      aria-invalid={fieldErrors?.sets ? 'true' : 'false'}
                      aria-describedby={
                        fieldErrors?.sets ? `exercise-sets-error-${index}` : undefined
                      }
                      {...register(`exercises.${index}.sets`, { valueAsNumber: true })}
                    />
                    {fieldErrors?.sets ? (
                      <p id={`exercise-sets-error-${index}`} role="alert" className="field-error">
                        {fieldErrors.sets.message}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label htmlFor={`exercise-reps-${index}`} className="field-label">
                      Reps
                    </label>
                    <input
                      id={`exercise-reps-${index}`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      className="field-input"
                      aria-invalid={fieldErrors?.reps ? 'true' : 'false'}
                      aria-describedby={
                        fieldErrors?.reps ? `exercise-reps-error-${index}` : undefined
                      }
                      {...register(`exercises.${index}.reps`, { valueAsNumber: true })}
                    />
                    {fieldErrors?.reps ? (
                      <p id={`exercise-reps-error-${index}`} role="alert" className="field-error">
                        {fieldErrors.reps.message}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <Button
          variant="secondary"
          onClick={() =>
            append({
              id: createExerciseId(),
              name: '',
              sets: 3,
              reps: 10,
            })
          }
          disabled={fields.length >= 20}
          className="w-full"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add movement
        </Button>

        {errors.exercises?.root ? (
          <p role="alert" className="field-error">
            {errors.exercises.root.message}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="seal-heading" className="space-y-5">
        <SectionHeading
          number="03"
          id="seal-heading"
          title="The seal"
          description="Review the allocations before carving them into this device."
        />

        <div className="border border-line bg-panel/60">
          <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
            <ReviewCell label="Daily allocation" value={formatINR(dailyAmount)} />
            <ReviewCell label="Ritual length" value={`${durationDays || 0} days`} />
          </div>
          <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
            <ReviewCell label="Movements" value={`${exerciseCount}`} />
            <ReviewCell label="Demo deposit" value={formatINR(totalAmount)} accent />
          </div>

          <div className="px-4 py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <span className="eyebrow">Daily coffins</span>
              <span className="text-xs text-muted">{durationDays || 0} allocations</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5" aria-hidden="true">
              {Array.from({ length: Math.min(durationDays || 0, 14) }, (_, index) => (
                <span key={index} className="mini-coffin" />
              ))}
              {durationDays > 14 ? (
                <span className="self-center pl-1 font-mono text-[0.62rem] text-muted">
                  +{durationDays - 14}
                </span>
              ) : null}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Complete a day and that day's allocation is returned. Miss it and only that day's
              allocation is lost. Future days stay locked. In this prototype, outcomes are previewed
              with demo controls — nothing settles automatically.
            </p>
          </div>
        </div>

        <div className="border border-rust/25 bg-rust/[0.045] px-4 py-3">
          <p className="text-xs leading-relaxed text-bone-dim">
            <span className="font-semibold text-rust">Demo: no real money moves.</span> No payment
            provider is connected. A camera capture is not verification; the verification method is
            still undecided.
          </p>
        </div>

        {submitError ? (
          <p role="alert" className="field-error">
            {submitError}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          Seal demo commitment
        </Button>
      </section>
    </form>
  )
}

function SectionHeading({
  number,
  id,
  title,
  description,
}: {
  number: string
  id: string
  title: string
  description: string
}) {
  return (
    <div className="flex gap-4 border-t border-line pt-5">
      <span className="mt-1 font-mono text-[0.6rem] tracking-[0.18em] text-rust">{number}</span>
      <div>
        <h2 id={id} className="font-display text-2xl font-medium leading-none text-bone">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
      </div>
    </div>
  )
}

function ReviewCell({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="min-w-0 px-4 py-4">
      <p className="text-[0.58rem] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p
        className={
          accent
            ? 'mt-1.5 break-words font-display text-xl font-medium tabular-nums text-gold'
            : 'mt-1.5 break-words font-display text-xl font-medium tabular-nums text-bone'
        }
      >
        {value}
      </p>
    </div>
  )
}

function createDefaultValues(): SetupValues {
  return {
    dailyAmount: 1000,
    durationDays: 10,
    exercises: [
      { id: createExerciseId(), name: 'Push-ups', sets: 3, reps: 12 },
      { id: createExerciseId(), name: 'Bodyweight squats', sets: 3, reps: 15 },
      { id: createExerciseId(), name: 'Sit-ups', sets: 3, reps: 12 },
    ],
  }
}

function createExerciseId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
