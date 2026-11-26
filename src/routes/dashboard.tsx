import { createFileRoute, Link } from '@tanstack/react-router'
import { Camera, CircleAlert, Lock, ScrollText } from 'lucide-react'
import type { CaptureSummary, CommitmentPlan } from '#/lib/commitment'
import { buildDayAllocations, getCommitmentTotals, getOpenDay } from '#/lib/commitment'
import { useCommitment } from '#/lib/commitment-store'
import { formatClock, formatDateTime, formatINR } from '#/lib/format'
import { AppShell } from '#/components/app-shell'
import { CoffinCard } from '#/components/coffin-card'
import { ExerciseList } from '#/components/exercise-list'
import { MoneySummary } from '#/components/money-summary'
import { PlanGate } from '#/components/plan-gate'
import { buttonStyles } from '#/components/ui/button'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <AppShell>
      <PlanGate>{(plan) => <DashboardContent plan={plan} />}</PlanGate>
    </AppShell>
  )
}

function DashboardContent({ plan }: { plan: CommitmentPlan }) {
  const { state } = useCommitment()
  const allocations = buildDayAllocations(state)
  const totals = getCommitmentTotals(state)
  const openDay = getOpenDay(state)
  const openCapture = openDay ? state.captures[String(openDay)] : undefined
  const isClosed = openDay === null

  return (
    <div className="space-y-9">
      <header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="eyebrow">
            {isClosed ? 'Every day has a demo outcome' : `Day ${openDay} of ${plan.durationDays}`}
          </p>
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted">
            {totals.settledDays}/{totals.totalDays} settled
          </span>
        </div>

        <h1 className="mt-4 max-w-xl font-display text-[clamp(2.7rem,12vw,4.5rem)] font-medium leading-[0.9] tracking-[-0.02em] text-bone">
          {isClosed ? 'The ledger is closed.' : "Today's rite."}
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
          {isClosed
            ? 'Every daily allocation has a demo settlement. Nothing else will move automatically.'
            : `${formatINR(plan.dailyAmount)} is at stake for one required session. Demo only — no real money moves.`}
        </p>
      </header>

      {isClosed ? (
        <ClosedRitual plan={plan} />
      ) : (
        <section
          aria-labelledby="today-session-heading"
          className="relative overflow-hidden border border-line bg-panel/75"
        >
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,rgba(210,105,78,0.12),transparent_70%)]"
          />
          <div className="relative border-b border-line px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Open now · Day {openDay}</p>
                <h2
                  id="today-session-heading"
                  className="mt-1.5 font-display text-2xl font-medium leading-none text-bone"
                >
                  Required session
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[0.58rem] uppercase tracking-[0.16em] text-muted">At stake</p>
                <p className="mt-1 font-display text-2xl font-medium tabular-nums text-rust">
                  {formatINR(plan.dailyAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="relative px-4 py-4 sm:px-5">
            <ExerciseList exercises={plan.exercises} />

            <div className="mt-5 border border-line bg-void/35 px-3.5 py-3">
              {openCapture ? (
                <CaptureNote capture={openCapture} />
              ) : (
                <p className="flex gap-2 text-xs leading-relaxed text-muted">
                  <Camera aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
                  No live capture is recorded for this open day. A capture is local-only and does
                  not verify completion or settle money.
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                to="/record"
                className={buttonStyles({
                  variant: 'primary',
                  size: 'lg',
                  className: 'w-full sm:w-auto sm:flex-1',
                })}
              >
                <Camera aria-hidden="true" className="h-4 w-4" />
                {openCapture ? 'Record another take' : 'Enter the mirror'}
              </Link>
              <Link
                to="/history"
                className={buttonStyles({
                  variant: 'secondary',
                  size: 'lg',
                  className: 'w-full sm:w-auto',
                })}
              >
                <ScrollText aria-hidden="true" className="h-4 w-4" />
                Open the ledger
              </Link>
            </div>
          </div>
        </section>
      )}

      <MoneySummary totals={totals} />

      <section aria-labelledby="allocations-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">The daily coffins</p>
            <h2
              id="allocations-heading"
              className="mt-1.5 font-display text-2xl font-medium leading-none text-bone"
            >
              {plan.durationDays} daily allocations
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
            <Lock aria-hidden="true" className="h-3 w-3" />
            Future stays locked
          </span>
        </div>

        <ol className="coffin-grid mt-4" aria-label="Daily allocations">
          {allocations.map((allocation, index) => (
            <CoffinCard key={allocation.day} allocation={allocation} index={index} />
          ))}
        </ol>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-3 text-[0.58rem] uppercase tracking-[0.14em] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="status-dot bg-rust" /> Open
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="status-dot bg-sage" /> Returned
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="status-dot bg-rust-deep ring-1 ring-rust/60" /> Lost
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="status-dot bg-faint" /> Locked
          </span>
        </div>

        <p className="mt-3 flex gap-2 text-xs leading-relaxed text-faint">
          <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          Days do not advance by the clock in this prototype. Demo previews in the ledger decide the
          next day's outcome. Calendar cutoffs, timezone and interrupted-session rules are still
          undecided.
        </p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-xs">
        <Link
          to="/setup"
          className="text-muted underline decoration-line underline-offset-4 hover:text-bone"
        >
          Commitment terms &amp; reset
        </Link>
        <Link
          to="/history"
          className="inline-flex items-center gap-1.5 text-rust hover:text-bone-dim"
        >
          Preview completed and missed days
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  )
}

function CaptureNote({ capture }: { capture: CaptureSummary }) {
  const status =
    capture.status === 'captured'
      ? 'Capture summary saved'
      : capture.status === 'interrupted'
        ? 'Interrupted capture summary saved'
        : 'Failed capture'

  return (
    <div className="space-y-1 text-xs leading-relaxed">
      <p className="flex items-center gap-2 text-bone-dim">
        <Camera aria-hidden="true" className="h-4 w-4 shrink-0 text-sage" />
        <span>
          {status} · {formatClock(capture.durationSeconds)} · {formatDateTime(capture.capturedAt)}
        </span>
      </p>
      <p className="pl-6 text-muted">
        Recording status is separate from verification. Verification is pending and no money was
        moved by this capture.
      </p>
      {capture.note ? <p className="pl-6 text-rust/90">{capture.note}</p> : null}
    </div>
  )
}

function ClosedRitual({ plan }: { plan: CommitmentPlan }) {
  return (
    <section className="border border-line bg-panel/60 px-4 py-6 sm:px-6">
      <p className="eyebrow">Ritual complete · demo</p>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
        All {plan.durationDays} daily allocations have a demo settlement. Use the ledger to inspect
        every recording status, the pending verification state and the demo money outcomes.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to="/history" className={buttonStyles({ variant: 'primary' })}>
          Open the ledger
        </Link>
        <Link to="/setup" className={buttonStyles({ variant: 'secondary' })}>
          Review or reset terms
        </Link>
      </div>
    </section>
  )
}
