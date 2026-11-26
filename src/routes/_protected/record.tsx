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

  if (error) return <p role="alert" className="field-error">{error}</p>
  if (!data) return <p className="text-muted">Opening the mirror…</p>

  const challenge = data.challenge
  if (!challenge || challenge.status !== 'active') {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-bone">No open day.</h1>
        <p className="text-sm text-muted">You need an active challenge with an open day to record.</p>
      </div>
    )
  }

  const openDay = data.days.find((d) => d.status === 'pending')
  if (!openDay) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-bone">Today's window is closed.</h1>
        <p className="text-sm text-muted">There's no open day right now. Come back when the next day opens.</p>
      </div>
    )
  }

  return (
    <RepRecorder
      dayNumber={openDay.dayNumber}
      exerciseType={challenge.exerciseType}
      customGesture={challenge.customGesture}
      targetSets={challenge.targetSets}
      targetReps={challenge.targetReps}
    />
  )
}
