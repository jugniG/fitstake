import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertTriangle, ShieldQuestion } from 'lucide-react'
import type { CommitmentPlan } from '#/lib/commitment'
import { buildDayAllocations, getCommitmentTotals, getOpenDay } from '#/lib/commitment'
import { useCommitment } from '#/lib/commitment-store'
import { formatINR } from '#/lib/format'
import { AppShell } from '#/components/app-shell'
import { DemoControls } from '#/components/history/demo-controls'
import { DayRecord } from '#/components/history/day-record'
import { LedgerEvents } from '#/components/history/ledger-events'
import { MoneySummary } from '#/components/money-summary'
import { PlanGate } from '#/components/plan-gate'
import { ResetDemo } from '#/components/reset-demo'

export const Route = createFileRoute('/history')({
  component: HistoryPage,
})

function HistoryPage() {
  return (
    <AppShell>
      <PlanGate>{(plan) => <HistoryContent plan={plan} />}</PlanGate>
    </AppShell>
  )
}

function HistoryContent({ plan }: { plan: CommitmentPlan }) {
  const { state } = useCommitment()
  const allocations = buildDayAllocations(state)
  const totals = getCommitmentTotals(state)
  const openDay = getOpenDay(state)

  return (
    <div className="space-y-9">
      <header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="eyebrow">Receipts of the ritual</p>
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
            {totals.settledDays}/{totals.totalDays} settled
          </span>
        </div>
        <h1 className="mt-4 font-display text-[clamp(2.7rem,12vw,4.5rem)] font-medium leading-[0.9] tracking-[-0.02em] text-bone">
          The ledger.
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
          Recording, verification and settlement are separate records. Nothing here is a real
          transfer of money, and a camera capture is not proof of a completed workout.
        </p>
      </header>

      <MoneySummary totals={totals} />

      <div className="flex items-start gap-3 border border-gold/25 bg-gold/[0.04] px-4 py-3.5">
        <ShieldQuestion aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
        <p className="text-xs leading-relaxed text-bone-dim">
          <span className="font-medium text-gold">Verification is undecided.</span> Every recorded
          session remains unverified. The demo previews below settle allocations for inspection
          only; they do not authorize a payout or a real forfeiture.
        </p>
      </div>

      <DemoControls />

      <section aria-labelledby="day-ledger-heading">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
          <div>
            <p className="eyebrow">Allocations</p>
            <h2
              id="day-ledger-heading"
              className="mt-1.5 font-display text-2xl font-medium leading-none text-bone"
            >
              {plan.durationDays} days, carved one by one
            </h2>
          </div>
          <p className="text-xs text-muted">
            {openDay ? `Open day: ${openDay}` : 'Every day has a demo outcome'}
          </p>
        </div>

        <ol className="border-x border-line bg-panel/35">
          {allocations.map((allocation) => (
            <DayRecord key={allocation.day} allocation={allocation} />
          ))}
        </ol>
      </section>

      <LedgerEvents events={state.ledger} />

      <section className="border border-line bg-panel/40 p-4 sm:p-5">
        <p className="eyebrow">Not decided yet</p>
        <h2 className="mt-1.5 font-display text-xl font-medium text-bone">
          Rules this prototype deliberately leaves open.
        </h2>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
          <li>How completion and reps are verified, and who or what can attest to them.</li>
          <li>The daily cutoff, timezone and grace period for a session.</li>
          <li>What happens to a session interrupted by a call, camera failure or app switch.</li>
          <li>Where forfeited allocations go, and whether any portion is returned or donated.</li>
          <li>Real deposit custody, refunds, payment provider, KYC and dispute handling.</li>
        </ul>
        <p className="mt-3 flex gap-2 text-xs leading-relaxed text-faint">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          The demo only removes a lost amount from the returned total. It does not model where that
          money goes or apply an automatic penalty.
        </p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-xs">
        <Link
          to="/dashboard"
          className="text-muted underline decoration-line underline-offset-4 hover:text-bone"
        >
          Back to the ritual
        </Link>
        <Link
          to="/setup"
          className="text-muted underline decoration-line underline-offset-4 hover:text-bone"
        >
          Commitment terms
        </Link>
      </div>

      <ResetDemo />

      <p className="text-center font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">
        Total demo commitment {formatINR(totals.total)} · local prototype
      </p>
    </div>
  )
}
