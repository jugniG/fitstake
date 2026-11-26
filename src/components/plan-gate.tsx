import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { CommitmentPlan } from '#/lib/commitment'
import { useCommitment } from '#/lib/commitment-store'
import { buttonStyles } from '#/components/ui/button'
import { BrandMark } from '#/components/brand-mark'

export function PlanGate({ children }: { children: (plan: CommitmentPlan) => ReactNode }) {
  const { state, hydrated } = useCommitment()

  if (!hydrated) return <RitualLoading />
  if (!state.plan) return <NoCommitment />
  return <>{children(state.plan)}</>
}

export function RitualLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-5">
      <p className="eyebrow">Opening the ledger</p>
      <div className="h-32 animate-pulse border border-line bg-panel/60" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-20 animate-pulse border border-line bg-panel/40" />
        <div className="h-20 animate-pulse border border-line bg-panel/40" />
        <div className="h-20 animate-pulse border border-line bg-panel/40" />
      </div>
      <span className="sr-only">Loading your local demo commitment.</span>
    </div>
  )
}

function NoCommitment() {
  return (
    <div className="relative overflow-hidden border border-line bg-panel/70 px-5 py-10 text-center sm:px-10 sm:py-14">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgba(210,105,78,0.13),transparent_68%)]"
      />
      <BrandMark className="relative mx-auto h-16 w-11 text-rust" />
      <p className="eyebrow relative mt-6">No commitment is carved</p>
      <h1 className="relative mt-3 font-display text-3xl font-medium text-bone sm:text-4xl">
        Begin with a stake.
      </h1>
      <p className="relative mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
        Choose the exercises, the daily amount and the number of days. This prototype keeps
        everything on this device and moves no money.
      </p>
      <Link
        to="/setup"
        className={buttonStyles({ variant: 'primary', className: 'relative mt-7' })}
      >
        Set the terms
      </Link>
    </div>
  )
}
