import type { DashboardView } from '#/lib/server/challenges'
import { formatUSD } from '#/lib/format'
import { Card } from '#/components/ui/card'

export function MoneySummary({
  totals,
  challenge,
}: {
  totals: DashboardView['totals']
  challenge: DashboardView['challenge']
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <Cell label="Total committed" value={formatUSD(challenge?.totalCommitmentAmount ?? 0)} />
      <Cell label="Remaining at risk" value={formatUSD(totals.remainingAmount)} />
      <Cell label="Won back (safe)" value={formatUSD(totals.wonBackBalance)} tone="emerald" />
      <Cell
        label="Forfeited"
        value={formatUSD(totals.forfeitedBalance)}
        tone={totals.forfeitedBalance > 0 ? 'rose' : 'default'}
      />
    </div>
  )
}

function Cell({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
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
    </Card>
  )
}
