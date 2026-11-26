import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { createChallenge } from '#/lib/server/challenges'
import { EXERCISE_LABELS, CUSTOM_GESTURE_LABELS } from '#/lib/challenge'
import { formatUSD } from '#/lib/format'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import { ArrowRight } from 'lucide-react'

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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <Card className="p-6 sm:p-7 space-y-4">
        <h2 className="font-display text-lg font-bold text-[#0d1b2a]">01 · Choose Movement</h2>
        <div className="grid gap-3">
          <Label htmlFor="exerciseType">Exercise Type</Label>
          <select
            id="exerciseType"
            className="flex h-11 w-full rounded-2xl border border-[#0d1b2a1a] bg-white px-4 py-2 text-sm font-semibold text-[#0d1b2a] shadow-xs focus-visible:border-[#2b66f2] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#2b66f2]/15"
            {...register('exerciseType')}
          >
            {Object.entries(EXERCISE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {exerciseType === 'custom_gesture' ? (
            <div className="space-y-1.5 mt-2">
              <Label htmlFor="customGesture">Hand Gesture</Label>
              <select
                id="customGesture"
                className="flex h-11 w-full rounded-2xl border border-[#0d1b2a1a] bg-white px-4 py-2 text-sm font-semibold text-[#0d1b2a] shadow-xs focus-visible:border-[#2b66f2] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#2b66f2]/15"
                {...register('customGesture')}
              >
                {Object.entries(CUSTOM_GESTURE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="p-6 sm:p-7 space-y-4">
        <h2 className="font-display text-lg font-bold text-[#0d1b2a]">02 · Daily Volume</h2>
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Target sets"
            error={errors.targetSets?.message}
            {...register('targetSets', { valueAsNumber: true })}
          />
          <NumberField
            label="Reps per set"
            error={errors.targetReps?.message}
            {...register('targetReps', { valueAsNumber: true })}
          />
        </div>
      </Card>

      <Card className="p-6 sm:p-7 space-y-4">
        <h2 className="font-display text-lg font-bold text-[#0d1b2a]">03 · Financial Stake</h2>
        <div className="grid grid-cols-2 gap-4">
          <NumberField
            label="Daily stake (USD)"
            prefix="$"
            error={errors.dailyStakeAmount?.message}
            {...register('dailyStakeAmount', { valueAsNumber: true })}
          />
          <NumberField
            label="Challenge duration (days)"
            error={errors.totalDays?.message}
            {...register('totalDays', { valueAsNumber: true })}
          />
        </div>

        <div className="rounded-2xl border border-[#0d1b2a14] bg-[#faf8f5] p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5a6678]">
              Total Upfront Pot (Escrow)
            </span>
            <span className="font-mono text-3xl font-extrabold tabular-nums text-[#2b66f2]">
              {formatUSD(total)}
            </span>
          </div>
          <p className="mt-2 text-xs font-medium text-[#5a6678]">
            {formatUSD(dailyStake)} × {totalDays || 0} days, held safely in audited escrow. 100% of
            this pot is refunded to your payment card as you complete each day on camera.
          </p>
        </div>
      </Card>

      <Card className="p-6 sm:p-7 space-y-4">
        <h2 className="font-display text-lg font-bold text-[#0d1b2a]">04 · Start Date</h2>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2.5 rounded-2xl border border-[#0d1b2a1a] bg-white p-4 cursor-pointer transition-all hover:border-[#2b66f2]/50 shadow-xs">
            <input
              type="radio"
              value="0"
              className="accent-[#2b66f2] size-4"
              {...register('startDayOffset')}
            />
            <span className="text-sm font-bold text-[#0d1b2a]">Today</span>
          </label>
          <label className="flex items-center gap-2.5 rounded-2xl border border-[#0d1b2a1a] bg-white p-4 cursor-pointer transition-all hover:border-[#2b66f2]/50 shadow-xs">
            <input
              type="radio"
              value="1"
              className="accent-[#2b66f2] size-4"
              {...register('startDayOffset')}
            />
            <span className="text-sm font-bold text-[#0d1b2a]">Tomorrow</span>
          </label>
        </div>
        {late ? (
          <p className="text-xs font-semibold text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
            It's late in your day — Day 1 would be short. Starting tomorrow is recommended.
          </p>
        ) : null}
      </Card>

      {submitError ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-500/20 bg-rose-50 p-3.5 text-center text-xs font-semibold text-rose-700"
        >
          {submitError}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full py-4 text-base shadow-md flex items-center justify-center gap-2"
        disabled={isSubmitting}
      >
        Lock In Commitment & Deposit {formatUSD(total)} <ArrowRight className="size-4" />
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
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative flex items-center">
        {prefix ? (
          <span className="absolute left-3.5 text-sm font-bold text-[#5a6678] pointer-events-none">
            {prefix}
          </span>
        ) : null}
        <Input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          className={prefix ? 'pl-8' : ''}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-semibold text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}
