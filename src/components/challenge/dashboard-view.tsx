import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { DashboardView } from '#/lib/server/challenges'
import { EXERCISE_LABELS, CUSTOM_GESTURE_LABELS } from '#/lib/challenge'
import { formatUSD } from '#/lib/format'
import { startChallengeCheckout } from '#/lib/server/challenges'
import { MoneySummary } from './money-summary'
import { DayList } from './day-list'
import { Button, buttonStyles } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Video, ArrowRight, ShieldCheck, Flame } from 'lucide-react'

export function DashboardView({
  data,
  confirmingPayment = false,
}: {
  data: DashboardView
  confirmingPayment?: boolean
}) {
  const { challenge, days, totals } = data

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

  return (
    <div className="space-y-6">
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
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <ShieldCheck className="size-4" /> Escrow Protected
          </span>
        </div>

        <div className="mt-4">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#0d1b2a]">
            {exerciseLabel}
          </h1>
          <p className="mt-1 text-sm font-medium text-[#5a6678]">
            {challenge.targetSets} sets × {challenge.targetReps} reps · {challenge.totalDays} days ·{' '}
            {formatUSD(challenge.dailyStakeAmount)}/day
          </p>
        </div>

        {challenge.status === 'active' && hasOpenDay ? (
          <div className="mt-6">
            <Link
              to="/record"
              className={buttonStyles({
                variant: 'primary',
                size: 'lg',
                className: 'w-full py-3.5 text-base flex items-center justify-center gap-2',
              })}
            >
              <Video className="size-5" /> Record Today's Workout
            </Link>
          </div>
        ) : null}
      </Card>

      {challenge.status === 'pending_charge' ? (
        <Card className="border-amber-200 bg-amber-50 p-5 text-amber-900">
          <p className="text-sm font-bold">
            {confirmingPayment ? 'Confirming your payment…' : 'Payment not completed.'}
          </p>
          <p className="mt-1 text-xs text-amber-800/80">
            {confirmingPayment
              ? 'Confirming your deposit. This page refreshes automatically once confirmed.'
              : challenge.kelviqCheckoutUrl
                ? 'Your challenge is saved. Finish the checkout to open Day 1.'
                : 'Your challenge is saved, but the payment link was not created.'}
          </p>
          {!confirmingPayment && challenge.kelviqCheckoutUrl ? (
            <a
              href={challenge.kelviqCheckoutUrl}
              className={buttonStyles({ variant: 'primary', className: 'w-full mt-4' })}
            >
              Resume checkout
            </a>
          ) : null}
          {!confirmingPayment && !challenge.kelviqCheckoutUrl ? <RetryPaymentButton /> : null}
        </Card>
      ) : null}

      <MoneySummary totals={totals} challenge={challenge} />

      {challenge.status === 'active' && !hasOpenDay ? (
        <Card className="border-[#0d1b2a14] bg-white p-5 text-center text-sm font-medium text-[#5a6678]">
          ✓ Today's workout is complete! Next daily window opens at midnight in your timezone.
        </Card>
      ) : null}

      {challenge.status === 'settling' ? (
        <Card className="border-blue-200 bg-blue-50 p-5 text-blue-900">
          <p className="text-sm font-bold">Settling your refund…</p>
          <p className="mt-1 text-xs text-blue-800">
            Secure escrow is issuing your automated refund. This page will update shortly.
          </p>
        </Card>
      ) : null}

      {challenge.status === 'settled' ? (
        <div className="space-y-4">
          <Card className="border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
            <p className="text-sm font-bold">Challenge settled.</p>
            <p className="mt-1 text-xs text-emerald-800">
              {totals.wonBackBalance > 0
                ? `${formatUSD(totals.wonBackBalance)} won back has been refunded to your original payment card.`
                : 'No days were completed, so no refund was issued.'}
            </p>
          </Card>
          <Link
            to="/setup"
            className={buttonStyles({ variant: 'primary', className: 'w-full py-3.5' })}
          >
            Start a new challenge
          </Link>
        </div>
      ) : null}

      <DayList days={days} />
    </div>
  )
}

function RetryPaymentButton() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function retry() {
    setBusy(true)
    setError(null)
    try {
      const result = await startChallengeCheckout()
      window.location.assign(result.checkoutUrl)
    } catch (cause) {
      console.error('[dashboard] retry checkout failed:', cause)
      setError((cause as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="secondary" className="w-full" onClick={() => void retry()} disabled={busy}>
        {busy ? 'Creating payment link…' : 'Retry payment link'}
      </Button>
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pending_charge':
      return 'Payment pending'
    case 'active':
      return 'In progress'
    case 'settling':
      return 'Settling'
    case 'settled':
      return 'Complete'
    default:
      return status
  }
}
