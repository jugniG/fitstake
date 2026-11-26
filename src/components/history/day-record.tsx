import { Camera, Lock, ShieldQuestion, Unlock } from 'lucide-react'
import type { ReactNode } from 'react'
import type { DayAllocation } from '#/lib/commitment'
import { formatClock, formatDateTime, formatINR } from '#/lib/format'
import { cn } from '#/lib/utils'

export function DayRecord({ allocation }: { allocation: DayAllocation }) {
  const { capture, settlement, status } = allocation
  const isSettled = Boolean(settlement)
  const settledMessage =
    settlement?.type === 'demo_return'
      ? `Demo: ${formatINR(settlement.amount)} returned`
      : settlement?.type === 'demo_loss'
        ? `Demo: ${formatINR(settlement.amount)} lost`
        : null

  return (
    <li className="border-b border-line px-4 py-4 last:border-b-0 sm:px-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <MiniCoffin status={status} />
          <div>
            <p className="font-display text-lg font-medium leading-none text-bone">
              Day {allocation.day}
            </p>
            <p className="mt-1.5 text-[0.62rem] uppercase tracking-[0.14em] text-muted">
              {allocationStatusLabel(status)}
            </p>
          </div>
        </div>
        <p
          className={cn(
            'shrink-0 font-display text-xl font-medium tabular-nums',
            status === 'returned' && 'text-sage',
            status === 'lost' && 'text-rust',
            status === 'open' && 'text-bone',
            status === 'locked' && 'text-faint',
          )}
        >
          {formatINR(allocation.amount)}
        </p>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3 sm:gap-5">
        <RecordField
          icon={<Camera aria-hidden="true" className="h-3.5 w-3.5" />}
          label="Recording"
          value={recordingLabel(allocation)}
          detail={
            capture
              ? `${formatClock(capture.durationSeconds)} · ${formatDateTime(capture.capturedAt)}`
              : status === 'locked'
                ? 'This day is still locked.'
                : 'No capture summary saved.'
          }
          tone={capture ? 'capture' : 'quiet'}
        />

        <RecordField
          icon={<ShieldQuestion aria-hidden="true" className="h-3.5 w-3.5" />}
          label="Verification"
          value="Pending"
          detail="Method undecided. A camera capture is not proof of completion."
          tone="pending"
        />

        <RecordField
          icon={
            isSettled ? (
              <Unlock aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <Lock aria-hidden="true" className="h-3.5 w-3.5" />
            )
          }
          label="Settlement"
          value={
            settledMessage ??
            (status === 'open' ? 'Open · not settled' : 'Locked · future allocation')
          }
          detail={
            settlement
              ? `Preview settlement · ${formatDateTime(settlement.createdAt)}`
              : status === 'open'
                ? 'No automatic loss or return is applied.'
                : 'Future allocations stay locked.'
          }
          tone={settlement?.type === 'demo_return' ? 'returned' : settlement ? 'lost' : 'quiet'}
        />
      </dl>
    </li>
  )
}

function RecordField({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string
  detail: string
  tone: 'capture' | 'pending' | 'returned' | 'lost' | 'quiet'
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[0.58rem] uppercase tracking-[0.15em] text-muted">
        {icon}
        {label}
      </dt>
      <dd
        className={cn(
          'mt-1 break-words text-xs font-medium leading-snug',
          tone === 'capture' && 'text-sage',
          tone === 'pending' && 'text-gold',
          tone === 'returned' && 'text-sage',
          tone === 'lost' && 'text-rust',
          tone === 'quiet' && 'text-bone-dim',
        )}
      >
        {value}
      </dd>
      <dd className="mt-1 text-[0.67rem] leading-relaxed text-faint">{detail}</dd>
    </div>
  )
}

function MiniCoffin({ status }: { status: DayAllocation['status'] }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'mini-coffin-mark',
        status === 'open' && 'mini-coffin-mark-open',
        status === 'returned' && 'mini-coffin-mark-returned',
        status === 'lost' && 'mini-coffin-mark-lost',
      )}
    />
  )
}

function recordingLabel(allocation: DayAllocation): string {
  if (!allocation.capture) return 'Not recorded'
  if (allocation.capture.status === 'captured') return 'Captured'
  if (allocation.capture.status === 'interrupted') return 'Interrupted'
  return 'Failed'
}

function allocationStatusLabel(status: DayAllocation['status']): string {
  switch (status) {
    case 'returned':
      return 'Demo returned · lid open'
    case 'lost':
      return 'Demo lost · sealed'
    case 'open':
      return 'Open now'
    default:
      return 'Future · locked'
  }
}
