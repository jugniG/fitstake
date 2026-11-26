import { DoorOpen, X } from 'lucide-react'
import { useState } from 'react'
import { getOpenDay } from '#/lib/commitment'
import { useCommitment } from '#/lib/commitment-store'
import { formatINR } from '#/lib/format'
import { Button } from '#/components/ui/button'

export function DemoControls() {
  const { state, previewSettlement } = useCommitment()
  const [message, setMessage] = useState<string | null>(null)
  const openDay = getOpenDay(state)
  const amount = state.plan?.dailyAmount ?? 0

  const settle = (outcome: 'returned' | 'lost') => {
    const result = previewSettlement(outcome)
    setMessage(result.message)
  }

  return (
    <section
      aria-labelledby="demo-controls-heading"
      className="relative border border-dashed border-rust/40 bg-rust/[0.035] p-4 sm:p-5"
    >
      <span
        aria-hidden="true"
        className="absolute -top-px left-4 h-px w-10 bg-rust shadow-[0_0_12px_rgba(210,105,78,0.6)]"
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-rust">Demo controls</p>
          <h2
            id="demo-controls-heading"
            className="mt-1.5 font-display text-2xl font-medium leading-none text-bone"
          >
            Preview an outcome.
          </h2>
        </div>
        {openDay ? (
          <p className="text-right text-xs leading-relaxed text-muted">
            Next: <span className="text-bone-dim">Day {openDay}</span>
            <br />
            <span className="font-mono tabular-nums">{formatINR(amount)}</span>
          </p>
        ) : null}
      </div>

      <p className="mt-3 max-w-lg text-xs leading-relaxed text-muted">
        These buttons write demo settlement entries so you can inspect the completed and missed
        states. They do not verify a workout, move real money, or trigger an automatic forfeiture.
        Each daily allocation can settle once.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          variant="secondary"
          onClick={() => settle('returned')}
          disabled={!openDay}
          className="w-full sm:flex-1"
        >
          <DoorOpen aria-hidden="true" className="h-4 w-4 text-sage" />
          Preview returned day
        </Button>
        <Button
          variant="danger"
          onClick={() => settle('lost')}
          disabled={!openDay}
          className="w-full sm:flex-1"
        >
          <X aria-hidden="true" className="h-4 w-4" />
          Preview lost day
        </Button>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="mt-3 min-h-5 text-xs leading-relaxed text-bone-dim"
      >
        {message ??
          (openDay
            ? 'Nothing changes until you choose a preview.'
            : 'Every allocation already has a demo settlement. Reset the demo to preview again.')}
      </p>
    </section>
  )
}
