import type { DashboardView } from '#/lib/server/challenges'
import type { DayStatus } from '#/lib/challenge'
import { formatDate } from '#/lib/format'
import { Card } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'

const STATUS_BADGE: Record<
  DayStatus,
  { label: string; variant: 'success' | 'default' | 'outline' | 'destructive' }
> = {
  locked: { label: 'Locked', variant: 'outline' },
  pending: { label: 'Open Today', variant: 'default' },
  completed: { label: 'Completed', variant: 'success' },
  forfeited: { label: 'Forfeited', variant: 'destructive' },
}

export function DayList({ days }: { days: DashboardView['days'] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold text-[#0d1b2a]">Daily Workout History</h2>
      <Card className="overflow-hidden divide-y divide-[#0d1b2a10] rounded-2xl p-0">
        <ol className="divide-y divide-[#0d1b2a10]">
          {days.map((d) => {
            const badge = STATUS_BADGE[d.status]
            return (
              <li
                key={d.dayNumber}
                className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[#faf8f5]/60"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-7 place-items-center rounded-lg bg-[#eef3fb] font-mono text-xs font-bold text-[#2b66f2]">
                    {d.dayNumber}
                  </span>
                  <div>
                    <span className="text-sm font-bold text-[#0d1b2a]">Day {d.dayNumber}</span>
                    <span className="ml-2 text-xs text-[#5a6678]">
                      Due {formatDate(d.windowEndUtc)}
                    </span>
                  </div>
                </div>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </li>
            )
          })}
        </ol>
      </Card>
    </section>
  )
}
