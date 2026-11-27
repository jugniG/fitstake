import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { readSetupDraft } from '#/components/challenge/setup-draft'
import { getDashboard } from '#/lib/server/challenges'
import type { DashboardView } from '#/lib/server/challenges'
import { DashboardView as DashboardViewComponent } from '#/components/challenge/dashboard-view'

const POLL_MS = 3000
const MAX_POLLS = 20

export const Route = createFileRoute('/_protected/dashboard')({
  validateSearch: (search: Record<string, unknown>) =>
    search.mandate === 'return' ? { mandate: 'return' as const } : {},
  component: DashboardPage,
})

function DashboardPage() {
  const { mandate } = Route.useSearch()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardView | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let polls = 0
    let timer: number | undefined
    async function load() {
      try {
        const result = await getDashboard()
        if (!active) return
        // Onboarding finished but the card was never authorized: resume at the consent step.
        if (!result.challenge && readSetupDraft()) {
          void navigate({ to: '/setup', replace: true })
          return
        }
        setData(result)
        setError(null)
        // Poll only after returning from the authorization page. A directly opened unfinished
        // authorization should show Resume, not spin waiting for a webhook that won't come.
        polls += 1
        if (
          mandate === 'return' &&
          result.challenge?.status === 'pending_mandate' &&
          polls < MAX_POLLS
        ) {
          timer = window.setTimeout(load, POLL_MS)
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
  }, [mandate, navigate])

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
      confirmingMandate={mandate === 'return' && data.challenge?.status === 'pending_mandate'}
    />
  )
}
