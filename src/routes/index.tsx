import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useCommitment } from '#/lib/commitment-store'
import { BrandMark } from '#/components/brand-mark'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  const { state, hydrated } = useCommitment()
  const navigate = useNavigate()

  useEffect(() => {
    if (!hydrated) return
    void navigate({
      to: state.plan ? '/dashboard' : '/setup',
      replace: true,
    })
  }, [hydrated, navigate, state.plan])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <BrandMark className="h-16 w-11 text-rust" />
      <p className="eyebrow mt-6">Workout Commitment</p>
      <h1 className="mt-2 font-display text-3xl font-medium text-bone">Opening the ledger.</h1>
      <p className="mt-2 text-xs text-muted">Demo: no real money moves.</p>
    </div>
  )
}
