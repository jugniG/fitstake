import { createFileRoute } from '@tanstack/react-router'
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
  const [data, setData] = useState<DashboardView | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let timer: number | undefined
    async function load() {
      try {
        const result = await getDashboard()
        if (!active) return
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
  }, [checkout])

  if (error) {
    return (
      <p role="alert" className="field-error">
        {error}
      </p>
    )
  }
  if (!data) {
    return <p className="text-muted">Opening the ledger…</p>
  }
  return (
    <DashboardViewComponent
      data={data}
      confirmingPayment={checkout === 'return' && data.challenge?.status === 'pending_charge'}
    />
  )
}
