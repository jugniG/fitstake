import type { DashboardView } from '#/lib/server/challenges'
import type { DayStatus } from '#/lib/challenge'
import { formatDate } from '#/lib/format'

const STATUS_LABEL: Record<DayStatus, string> = {
  locked: 'Locked',
  pending: 'Open',
  completed: 'Done',
  forfeited: 'Lost',
}

const STATUS_TONE: Record<DayStatus, string> = {
  locked: 'text-muted',
  pending: 'text-bone',
  completed: 'text-gold',
  forfeited: 'text-rust',
}

export function DayList({ days }: { days: DashboardView['days'] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl text-bone">Daily ledger</h2>
      <ol className="space-y-2">
        {days.map((d) => (
          <li
            key={d.dayNumber}
            className="flex items-center justify-between border border-line bg-panel/40 px-4 py-2.5"
          >
            <span className="text-sm text-bone-dim">
              Day {d.dayNumber}
              <span className="ml-2 text-xs text-muted">{formatDate(d.windowEndUtc)}</span>
            </span>
            <span
              className={`text-xs font-medium uppercase tracking-[0.16em] ${STATUS_TONE[d.status]}`}
            >
              {STATUS_LABEL[d.status]}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
