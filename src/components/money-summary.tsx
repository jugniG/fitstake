import type { CommitmentTotals } from '#/lib/commitment'
import { formatINR } from '#/lib/format'
import { cn } from '#/lib/utils'

export function MoneySummary({
  totals,
  className,
}: {
  totals: CommitmentTotals
  className?: string
}) {
  return (
    <section aria-label="Demo money totals" className={cn('', className)}>
      <div className="flex items-baseline justify-between gap-4 border-y border-line py-2.5">
        <span className="eyebrow">The ledger at a glance</span>
        <span className="font-mono text-[0.63rem] uppercase tracking-[0.14em] text-muted">
          Demo only
        </span>
      </div>

      <dl className="grid grid-cols-3 divide-x divide-line border-b border-line">
        <TotalCell label="Returned" amount={totals.returned} note="Demo returns" tone="returned" />
        <TotalCell label="Lost" amount={totals.lost} note="Demo losses" tone="lost" />
        <TotalCell label="Future locked" amount={totals.locked} note="Still ahead" tone="locked" />
      </dl>

      <div className="flex flex-col gap-1.5 border-b border-line py-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p>
          <span className="text-bone-dim">{formatINR(totals.atStake)}</span> at stake on the open
          day
        </p>
        <p>
          Total demo commitment{' '}
          <span className="font-mono tabular-nums text-bone-dim">{formatINR(totals.total)}</span>
        </p>
      </div>
    </section>
  )
}

function TotalCell({
  label,
  amount,
  note,
  tone,
}: {
  label: string
  amount: number
  note: string
  tone: 'returned' | 'lost' | 'locked'
}) {
  return (
    <div className="min-w-0 px-3 py-4 first:pl-0 last:pr-0 sm:px-5">
      <dt className="text-[0.6rem] uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd
        className={cn(
          'mt-2 break-words font-display text-[clamp(1.2rem,5vw,1.8rem)] font-medium leading-none tabular-nums',
          tone === 'returned' && 'text-sage',
          tone === 'lost' && 'text-rust',
          tone === 'locked' && 'text-bone',
        )}
      >
        {formatINR(amount)}
      </dd>
      <p className="mt-1.5 text-[0.6rem] uppercase tracking-[0.12em] text-faint">{note}</p>
    </div>
  )
}
