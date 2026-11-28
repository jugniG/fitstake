import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getDashboard } from '#/lib/server/challenges'
import type { DashboardView } from '#/lib/server/challenges'
import { DashboardView as DashboardViewComponent } from '#/components/challenge/dashboard-view'
import { saveSetupDraft } from '#/components/challenge/setup-draft'
import type { SetupDraft } from '#/components/challenge/setup-draft'
import { EXERCISE_CATALOG } from '#/components/challenge/exercise-drawer'

const POLL_MS = 3000
const MAX_POLLS = 20
// Matches the setup draft's limit.
const MAX_DRAFT_SETS = 20

// The setup form lists every catalog exercise with an enabled flag.
function draftFromChallenge(challenge: NonNullable<DashboardView['challenge']>): SetupDraft {
  return {
    totalDays: challenge.totalDays,
    dailyStakeAmount: challenge.dailyStakeAmount,
    startDayOffset: '0',
    exercises: EXERCISE_CATALOG.map((item) => {
      const chosen = challenge.routine.find((r) => r.exerciseType === item.type)
      return {
        enabled: !!chosen,
        exerciseType: item.type,
        customGesture:
          item.type === 'custom_gesture' ? (chosen?.customGesture ?? 'pinch') : null,
        targetSets: Math.min(chosen?.targetSets ?? item.defaultSets, MAX_DRAFT_SETS),
        targetReps: chosen?.targetReps ?? item.defaultReps,
      }
    }),
  }
}

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
        // No challenge yet: setup is the first screen, in both paywall versions. A draft resumes
        // where the user left off.
        if (!result.challenge) {
          void navigate({ to: '/setup', replace: true })
          return
        }
        // Card authorization removed: the plan stopped. Prefill setup with it so the user only
        // has to authorize payment again.
        if (result.challenge.status === 'mandate_lost') {
          saveSetupDraft(draftFromChallenge(result.challenge))
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
          result.challenge.status === 'pending_mandate' &&
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
