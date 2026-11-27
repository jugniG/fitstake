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

  if (error)
    return (
      <p
        role="alert"
        className="rounded-2xl border border-rose-500/20 bg-rose-50 p-4 text-center text-xs font-semibold text-rose-700"
      >
        {error}
      </p>
    )
  if (!data) return <p className="text-sm font-medium text-[#5a6678]">Loading history…</p>
  if (!data.challenge)
    return <p className="text-sm font-medium text-[#5a6678]">No active commitment yet.</p>

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#2b66f2]">
          Workout History
        </p>
        <h1 className="font-display text-3xl font-extrabold text-[#0d1b2a] sm:text-4xl">
          Day-by-day record
        </h1>
        <p className="text-sm text-[#5a6678]">
          Every rep verified on camera. Every missed day charged once.
        </p>
      </header>
      <MoneySummary totals={data.totals} />
      <DayList days={data.days} />
    </div>
  )
}
