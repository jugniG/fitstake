import type { DashboardView } from '#/lib/server/challenges'
import { formatUSD } from '#/lib/format'
import { Card } from '#/components/ui/card'

export function MoneySummary({ totals }: { totals: DashboardView['totals'] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <Cell
        label="Days completed"
        value={`${totals.completedDays}/${totals.totalDays}`}
        tone="emerald"
      />
      <Cell
        label="Charged for missed days"
        value={formatUSD(totals.chargedAmount)}
        tone={totals.chargedAmount > 0 ? 'rose' : 'default'}
      />
      <Cell
        label="Still at risk"
        value={formatUSD(totals.remainingExposure)}
        hint={`${totals.remainingDays} days left × ${formatUSD(totals.dailyStake)}`}
      />
      <Cell
        label="Owed"
        value={formatUSD(totals.owedAmount)}
        tone={totals.owedAmount > 0 ? 'rose' : 'default'}
        hint={totals.owedAmount > 0 ? 'Missed days not paid yet' : 'Nothing owed'}
      />
    </div>
  )
}

function Cell({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'emerald' | 'rose'
}) {
  const containerClasses = {
    default: 'border-[#0d1b2a14] bg-white text-[#0d1b2a]',
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-800',
    rose: 'border-rose-500/20 bg-rose-50 text-rose-800',
  }[tone]

  const textClasses = {
    default: 'text-[#0d1b2a]',
    emerald: 'text-emerald-700',
    rose: 'text-rose-600',
  }[tone]

  return (
    <Card className={`rounded-2xl p-4 sm:p-5 shadow-xs ${containerClasses}`}>
      <p className="text-[0.68rem] font-bold uppercase tracking-wider text-[#5a6678]">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-extrabold tabular-nums ${textClasses}`}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[0.7rem] text-[#5a6678]">{hint}</p> : null}
    </Card>
  )
}
