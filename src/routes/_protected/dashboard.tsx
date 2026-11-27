import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { readSetupDraft } from '#/components/challenge/setup-draft'
import { useEffect, useState } from 'react'
import { getDashboard } from '#/lib/server/challenges'
import type { DashboardView } from '#/lib/server/challenges'
import { DashboardView as DashboardViewComponent } from '#/components/challenge/dashboard-view'

export const Route = createFileRoute('/_protected/dashboard')({
  validateSearch: (search: Record<string, unknown>) =>
    search.checkout === 'return' ? { checkout: 'return' as const } : {},
  component: DashboardPage,
})

function DashboardPage() {
  const { checkout } = Route.useSearch()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardView | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let timer: number | undefined
    async function load() {
      try {
        const result = await getDashboard()
        if (!active) return
        // Onboarding finished but the pot was never deposited: resume at the review step.
        if (!result.challenge && readSetupDraft()) {
          void navigate({ to: '/setup', replace: true })
          return
        }
        setData(result)
        setError(null)
        // Poll only after returning from checkout. A directly opened abandoned checkout
        // should show Resume, not spin forever waiting for a webhook that will never come.
        if (checkout === 'return' && result.challenge?.status === 'pending_charge') {
          timer = window.setTimeout(load, 3000)
        }
      } catch (cause) {
        if (!active) return
        console.error('[dashboard] load failed:', cause)
        setError((cause as Error).message)
      }
    }
    void load()
    return () => {
      active = false
      if (timer) window.clearTimeout(timer)
    }
  }, [checkout, navigate])

  if (error) {
    return (
      <p role="alert" className="field-error">
        {error}
      </p>
    )
  }
  if (!data) {
    return <p className="text-muted">Loading your challenge…</p>
  }
  return (
    <DashboardViewComponent
      data={data}
      confirmingPayment={checkout === 'return' && data.challenge?.status === 'pending_charge'}
    />
  )
}
