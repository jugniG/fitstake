import type { DashboardView } from '#/lib/server/challenges'
import { formatUSD } from '#/lib/format'

export function MoneySummary({ totals, challenge }: { totals: DashboardView['totals']; challenge: DashboardView['challenge'] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Cell label="Total committed" value={formatUSD(challenge?.totalCommitmentAmount ?? 0)} />
      <Cell label="Remaining" value={formatUSD(totals.remainingAmount)} />
      <Cell label="Won back (safe)" value={formatUSD(totals.wonBackBalance)} accent />
      <Cell label="Forfeited" value={formatUSD(totals.forfeitedBalance)} />
    </div>
  )
}

function Cell({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-line bg-panel/45 px-4 py-3.5">
      <p className="text-[0.58rem] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={`mt-1.5 font-display text-xl font-medium tabular-nums ${accent ? 'text-gold' : 'text-bone'}`}>{value}</p>
    </div>
  )
}
