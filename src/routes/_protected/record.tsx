import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getDashboard } from '#/lib/server/challenges'
import type { DashboardView } from '#/lib/server/challenges'
import { RepRecorder } from '#/components/record/rep-recorder'

export const Route = createFileRoute('/_protected/record')({
  component: RecordPage,
})

function RecordPage() {
  const [data, setData] = useState<DashboardView | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const result = await getDashboard()
        if (active) setData(result)
      } catch (e) {
        if (active) {
          console.error('[record] load failed:', e)
          setError((e as Error).message)
        }
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  if (error)
    return (
      <p
        role="alert"
        className="rounded-2xl border border-rose-500/20 bg-rose-50 p-4 text-center text-xs font-semibold text-rose-700"
      >
        {error}
      </p>
    )
  if (!data) return <p className="text-sm font-medium text-[#5a6678]">Connecting camera…</p>

  const challenge = data.challenge
  if (!challenge || (challenge.status !== 'active' && challenge.status !== 'mandate_lost')) {
    return (
      <div className="rounded-3xl border border-[#0d1b2a14] bg-white p-8 text-center space-y-3">
        <h1 className="font-display text-2xl font-bold text-[#0d1b2a]">No open day.</h1>
        <p className="text-sm text-[#5a6678]">
          You need an active commitment with an open day to record.
        </p>
      </div>
    )
  }

  const openDay = data.days.find((d) => d.status === 'pending')
  if (!openDay) {
    return (
      <div className="rounded-3xl border border-[#0d1b2a14] bg-white p-8 text-center space-y-3">
        <h1 className="font-display text-2xl font-bold text-[#0d1b2a]">
          Today's window is closed.
        </h1>
        <p className="text-sm text-[#5a6678]">
          You've already completed today's workout! Next window opens at midnight.
        </p>
      </div>
    )
  }

  return (
    <RepRecorder
      dayNumber={openDay.dayNumber}
      routine={challenge.routine}
      exerciseType={challenge.exerciseType}
      customGesture={challenge.customGesture}
      targetSets={challenge.targetSets}
      targetReps={challenge.targetReps}
    />
  )
}
