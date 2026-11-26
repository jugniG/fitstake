import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { DashboardView } from '#/lib/server/challenges'
import { EXERCISE_LABELS, CUSTOM_GESTURE_LABELS } from '#/lib/challenge'
import { formatUSD } from '#/lib/format'
import { startChallengeCheckout } from '#/lib/server/challenges'
import { MoneySummary } from './money-summary'
import { DayList } from './day-list'
import { Button, buttonStyles } from '#/components/ui/button'

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
      <div className="space-y-6">
        <h1 className="font-display text-3xl font-medium text-bone">No active challenge.</h1>
        <p className="text-sm text-muted">Forge a new commitment to put real stakes on the line.</p>
        <Link to="/setup" className={buttonStyles({ variant: 'primary', size: 'lg' })}>
          Start a challenge
        </Link>
      </div>
    )
  }

  const exerciseLabel =
    challenge.exerciseType === 'custom_gesture'
      ? `${EXERCISE_LABELS.custom_gesture} (${CUSTOM_GESTURE_LABELS[challenge.customGesture ?? 'pinch']})`
      : EXERCISE_LABELS[challenge.exerciseType]
  const hasOpenDay = days.some((day) => day.status === 'pending')

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="eyebrow">{statusLabel(challenge.status)}</p>
        <h1 className="font-display text-3xl font-medium text-bone">{exerciseLabel}</h1>
        <p className="text-sm text-muted">
          {challenge.targetSets} sets × {challenge.targetReps} reps · {challenge.totalDays} days ·{' '}
          {formatUSD(challenge.dailyStakeAmount)}/day
        </p>
      </header>

      {challenge.status === 'pending_charge' ? (
        <div className="space-y-3 border border-line bg-panel/50 px-4 py-4">
          <p className="text-sm text-bone-dim">
            {confirmingPayment ? 'Confirming your payment…' : 'Payment not completed.'}
          </p>
          <p className="text-xs text-muted">
            {confirmingPayment
              ? 'Kelviq is confirming the charge. This page refreshes automatically while the webhook arrives.'
              : challenge.kelviqCheckoutUrl
                ? 'Your challenge is saved. Finish the checkout to open Day 1.'
                : 'Your challenge is saved, but the payment link was not created.'}
          </p>
          {!confirmingPayment && challenge.kelviqCheckoutUrl ? (
            <a
              href={challenge.kelviqCheckoutUrl}
              className={buttonStyles({ variant: 'primary', className: 'w-full' })}
            >
              Resume checkout
            </a>
          ) : null}
          {!confirmingPayment && !challenge.kelviqCheckoutUrl ? <RetryPaymentButton /> : null}
        </div>
      ) : null}

      <MoneySummary totals={totals} challenge={challenge} />

      {challenge.status === 'active' && hasOpenDay ? (
        <Link
          to="/record"
          className={buttonStyles({ variant: 'primary', size: 'lg', className: 'w-full' })}
        >
          Record today's workout
        </Link>
      ) : null}

      {challenge.status === 'active' && !hasOpenDay ? (
        <p className="border border-line bg-panel/40 px-4 py-3 text-sm text-bone-dim">
          No day is open right now. The next window opens at midnight in your pinned timezone.
        </p>
      ) : null}

      {challenge.status === 'settled' ? (
        <div className="border border-line bg-panel/50 px-4 py-4">
          <p className="text-sm text-bone-dim">Challenge settled.</p>
          <p className="mt-1 text-xs text-muted">
            {totals.wonBackBalance > 0
              ? `${formatUSD(totals.wonBackBalance)} won back has been refunded to your original payment method.`
              : 'No days were completed, so no refund was issued.'}
          </p>
        </div>
      ) : null}

      {challenge.status === 'settling' ? (
        <div className="border border-line bg-panel/50 px-4 py-4">
          <p className="text-sm text-bone-dim">Settling your refund…</p>
        </div>
      ) : null}

      {days.length > 0 ? <DayList days={days} /> : null}

      {challenge.status === 'settled' ? (
        <Link to="/setup" className={buttonStyles({ variant: 'secondary', className: 'w-full' })}>
          Start a new challenge
        </Link>
      ) : null}
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
