import { Link } from '@tanstack/react-router'
import type { CommitmentPlan, CommitmentState } from '#/lib/commitment'
import { getCommitmentTotals } from '#/lib/commitment'
import { formatINR } from '#/lib/format'
import { buttonStyles } from '#/components/ui/button'
import { ExerciseList } from '#/components/exercise-list'
import { MoneySummary } from '#/components/money-summary'
import { ResetDemo } from '#/components/reset-demo'

export function ExistingCommitment({
  plan,
  state,
}: {
  plan: CommitmentPlan
  state: CommitmentState
}) {
  const totals = getCommitmentTotals(state)

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Terms already carved</p>
        <h1 className="mt-3 font-display text-4xl font-medium leading-[0.95] text-bone sm:text-5xl">
          A commitment already exists.
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">
          This prototype keeps one commitment per browser. Reset the demo below to erase it and set
          new terms.
        </p>
      </div>

      <section aria-label="Current commitment" className="border border-line bg-panel/50">
        <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
          <div className="px-4 py-4">
            <p className="text-[0.58rem] uppercase tracking-[0.16em] text-muted">
              Daily allocation
            </p>
            <p className="mt-1.5 font-display text-2xl font-medium tabular-nums text-bone">
              {formatINR(plan.dailyAmount)}
            </p>
          </div>
          <div className="px-4 py-4">
            <p className="text-[0.58rem] uppercase tracking-[0.16em] text-muted">Ritual length</p>
            <p className="mt-1.5 font-display text-2xl font-medium tabular-nums text-bone">
              {plan.durationDays} days
            </p>
          </div>
        </div>
        <div className="px-4 py-5">
          <ExerciseList exercises={plan.exercises} />
        </div>
      </section>

      <MoneySummary totals={totals} />

      <div className="flex flex-wrap gap-2">
        <Link to="/dashboard" className={buttonStyles({ variant: 'primary' })}>
          Return to the ritual
        </Link>
        <Link to="/history" className={buttonStyles({ variant: 'secondary' })}>
          Open the ledger
        </Link>
      </div>

      <ResetDemo />
    </div>
  )
}
