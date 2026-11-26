import { DoorOpen, Flame, Lock, X } from 'lucide-react'
import type { DayAllocation, DayStatus } from '#/lib/commitment'
import { formatINR } from '#/lib/format'
import { cn } from '#/lib/utils'

const statusCopy: Record<DayStatus, string> = {
  locked: 'Locked',
  open: 'Open now',
  returned: 'Demo returned',
  lost: 'Demo lost',
}

const statusDescription: Record<DayStatus, string> = {
  locked: 'future allocation, locked',
  open: 'open day, at stake',
  returned: 'demo preview: amount returned',
  lost: 'demo preview: amount lost',
}

export function CoffinCard({ allocation, index }: { allocation: DayAllocation; index: number }) {
  const Icon =
    allocation.status === 'locked'
      ? Lock
      : allocation.status === 'open'
        ? Flame
        : allocation.status === 'returned'
          ? DoorOpen
          : X

  return (
    <li
      className={cn('coffin-item', `coffin-${allocation.status}`)}
      style={{ animationDelay: `${Math.min(index * 28, 240)}ms` }}
    >
      <div className="coffin-shell">
        <div className="coffin-face">
          <span className="coffin-day">Day {allocation.day}</span>

          <span className="coffin-amount">{formatINR(allocation.amount)}</span>

          <span className="coffin-status">
            <Icon aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={1.8} />
            <span>{statusCopy[allocation.status]}</span>
          </span>

          <span
            aria-hidden="true"
            className="absolute inset-x-6 bottom-2.5 h-px bg-line-strong/60"
          />
          <span className="sr-only">
            Day {allocation.day}, {formatINR(allocation.amount)}.{' '}
            {statusDescription[allocation.status]}.
          </span>
        </div>
      </div>
    </li>
  )
}
