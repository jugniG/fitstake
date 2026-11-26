import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { createChallenge } from '#/lib/server/challenges'
import { EXERCISE_LABELS, CUSTOM_GESTURE_LABELS } from '#/lib/challenge'
import { formatUSD } from '#/lib/format'
import { Button } from '#/components/ui/button'

const setupSchema = z.object({
  exerciseType: z.enum(['squat', 'push_up', 'jumping_jack', 'custom_gesture']),
  customGesture: z.enum(['pinch', 'fist', 'open_hand']),
  targetReps: z.number().int().min(1).max(1000),
  targetSets: z.number().int().min(1).max(100),
  dailyStakeAmount: z.number().int().min(1).max(100_000),
  totalDays: z.number().int().min(1).max(365),
  // A radio group hands react-hook-form the string "0"/"1", not a number.
  startDayOffset: z.enum(['0', '1']).transform((value) => (value === '1' ? 1 : 0)),
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
    formState: { errors, isSubmitting },
  } = useForm<SetupInput, unknown, SetupValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      exerciseType: 'squat',
      customGesture: 'pinch',
      targetReps: 15,
      targetSets: 3,
      dailyStakeAmount: 10,
      totalDays: 10,
      startDayOffset: late ? '1' : '0',
    },
  })

  const exerciseType = watch('exerciseType')
  const dailyStake = watch('dailyStakeAmount')
  const totalDays = watch('totalDays')
  const total =
    (Number.isFinite(dailyStake) ? dailyStake : 0) * (Number.isFinite(totalDays) ? totalDays : 0)

  async function onSubmit(values: SetupValues) {
    setSubmitError(null)
    const timezone =
      typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
    try {
      const result = await createChallenge({
        data: {
          exerciseType: values.exerciseType,
          customGesture: values.exerciseType === 'custom_gesture' ? values.customGesture : null,
          targetReps: values.targetReps,
          targetSets: values.targetSets,
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
      <section className="space-y-4">
        <h2 className="font-display text-xl text-bone">Movement</h2>
        <div className="grid gap-3">
          <label htmlFor="exerciseType" className="field-label">
            Exercise
          </label>
          <select id="exerciseType" className="field-input" {...register('exerciseType')}>
            {Object.entries(EXERCISE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {exerciseType === 'custom_gesture' ? (
            <div>
              <label htmlFor="customGesture" className="field-label">
                Hand gesture (one cycle = one rep)
              </label>
              <select id="customGesture" className="field-input" {...register('customGesture')}>
                {Object.entries(CUSTOM_GESTURE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl text-bone">Volume</h2>
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Target sets"
            error={errors.targetSets?.message}
            {...register('targetSets', { valueAsNumber: true })}
          />
          <NumberField
            label="Target reps per set"
            error={errors.targetReps?.message}
            {...register('targetReps', { valueAsNumber: true })}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl text-bone">Stake</h2>
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Daily stake (USD)"
            prefix="$"
            error={errors.dailyStakeAmount?.message}
            {...register('dailyStakeAmount', { valueAsNumber: true })}
          />
          <NumberField
            label="Total days"
            error={errors.totalDays?.message}
            {...register('totalDays', { valueAsNumber: true })}
          />
        </div>
        <div className="border border-line bg-panel/50 px-4 py-3">
          <div className="flex items-baseline justify-between">
            <span className="eyebrow">Total commitment</span>
            <span className="font-display text-2xl font-medium tabular-nums text-gold">
              {formatUSD(total)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {formatUSD(dailyStake)} × {totalDays || 0} days, charged once upfront. Applicable tax is
            added at checkout.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl text-bone">Start</h2>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2 border border-line bg-panel/45 px-4 py-3">
            <input type="radio" value="0" {...register('startDayOffset')} />
            <span className="text-sm text-bone-dim">Today</span>
          </label>
          <label className="flex items-center gap-2 border border-line bg-panel/45 px-4 py-3">
            <input type="radio" value="1" {...register('startDayOffset')} />
            <span className="text-sm text-bone-dim">Tomorrow</span>
          </label>
        </div>
        {late ? (
          <p className="text-xs text-rust/90">
            It's late in your day — Day 1 would be short. Starting tomorrow is recommended.
          </p>
        ) : null}
      </section>

      {submitError ? (
        <p role="alert" className="field-error">
          {submitError}
        </p>
      ) : null}

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting}>
        Pay {formatUSD(total)} and start
      </Button>
    </form>
  )
}

type NumberFieldProps = {
  label: string
  prefix?: string
  error?: string
} & React.InputHTMLAttributes<HTMLInputElement>

function NumberField({ label, prefix, error, id, ...props }: NumberFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <div>
      <label htmlFor={inputId} className="field-label">
        {label}
      </label>
      <div className="field-shell">
        {prefix ? <span className="field-prefix">{prefix}</span> : null}
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          className="field-input"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}
