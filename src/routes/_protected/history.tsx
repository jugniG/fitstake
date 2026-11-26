import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { getDashboard } from '#/lib/server/challenges'
import type { DashboardView } from '#/lib/server/challenges'
import { DayList } from '#/components/challenge/day-list'
import { MoneySummary } from '#/components/challenge/money-summary'

export const Route = createFileRoute('/_protected/history')({
  component: HistoryPage,
})

function HistoryPage() {
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
          console.error('[history] load failed:', e)
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
  if (!data) return <p className="text-muted">Loading the ledger…</p>
  if (!data.challenge) return <p className="text-muted">No challenge yet.</p>

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow">Ledger</p>
        <h1 className="font-display text-3xl font-medium text-bone">Day-by-day record</h1>
      </header>
      <MoneySummary totals={data.totals} challenge={data.challenge} />
      <DayList days={data.days} />
    </div>
  )
}
