import { createFileRoute } from '@tanstack/react-router'
import { useCommitment } from '#/lib/commitment-store'
import { AppShell } from '#/components/app-shell'
import { ExistingCommitment } from '#/components/setup/existing-commitment'
import { CommitmentForm } from '#/components/setup/commitment-form'
import { RitualLoading } from '#/components/plan-gate'

export const Route = createFileRoute('/setup')({
  component: SetupPage,
})

function SetupPage() {
  const { state, hydrated } = useCommitment()

  return (
    <AppShell hideNavigation={!hydrated || !state.plan}>
      {!hydrated ? (
        <RitualLoading />
      ) : state.plan ? (
        <ExistingCommitment plan={state.plan} state={state} />
      ) : (
        <div className="space-y-8">
          <div>
            <p className="eyebrow">A private daily ritual</p>
            <h1 className="mt-3 font-display text-[clamp(2.6rem,11vw,4.4rem)] font-medium leading-[0.9] tracking-[-0.02em] text-bone">
              Bind a ritual.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted sm:text-base">
              One workout session, every day. Stake your own money one day at a time. Complete a day
              and that day's allocation is returned; miss it and lose only that day. Future
              allocations stay locked.
            </p>
            <p className="mt-3 max-w-lg text-xs leading-relaxed text-faint">
              Example values are editable. This demo stores the plan and ledger in this browser
              only. No payments, verification or automatic settlement are connected.
            </p>
          </div>

          <CommitmentForm />

          <footer className="border-t border-line pt-6 text-xs leading-relaxed text-muted">
            <p className="eyebrow">What this prototype is</p>
            <p className="mt-2 max-w-lg">
              A local commitment ritual with simulated money. Camera recordings stay on the
              recording screen and are not uploaded. Completion verification is deliberately
              undecided, so nothing here authorizes a payout.
            </p>
          </footer>
        </div>
      )}
    </AppShell>
  )
}
