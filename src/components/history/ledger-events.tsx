import { ScrollText } from 'lucide-react'
import type { LedgerEvent } from '#/lib/commitment'
import { formatDateTime, formatINR } from '#/lib/format'
import { cn } from '#/lib/utils'

export function LedgerEvents({ events }: { events: LedgerEvent[] }) {
  return (
    <details className="group border border-line bg-panel/40">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm text-bone-dim [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <ScrollText aria-hidden="true" className="h-4 w-4 text-muted" strokeWidth={1.5} />
          Demo ledger entries
        </span>
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">
          {events.length} {events.length === 1 ? 'entry' : 'entries'}
        </span>
      </summary>

      <ol className="border-t border-line">
        {events.map((event) => (
          <li
            key={event.id}
            className="flex items-start justify-between gap-4 border-b border-line px-4 py-3 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="text-xs text-bone-dim">
                {event.type === 'demo_deposit'
                  ? 'Demo deposit'
                  : event.type === 'demo_return'
                    ? `Day ${event.day} · Demo return`
                    : `Day ${event.day} · Demo loss`}
              </p>
              <time dateTime={event.createdAt} className="mt-1 block text-[0.65rem] text-faint">
                {formatDateTime(event.createdAt)}
              </time>
            </div>
            <div className="shrink-0 text-right">
              <p
                className={cn(
                  'font-mono text-sm tabular-nums',
                  event.type === 'demo_deposit' && 'text-gold',
                  event.type === 'demo_return' && 'text-sage',
                  event.type === 'demo_loss' && 'text-rust',
                )}
              >
                {formatINR(event.amount)}
              </p>
              <p className="mt-0.5 text-[0.55rem] uppercase tracking-[0.14em] text-muted">
                {event.type === 'demo_deposit'
                  ? 'Demo deposit'
                  : event.type === 'demo_return'
                    ? 'Returned'
                    : 'Lost'}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </details>
  )
}
