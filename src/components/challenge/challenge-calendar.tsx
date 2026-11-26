import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import type { DashboardView } from '#/lib/server/challenges'
import { Card } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { formatUSD } from '#/lib/format'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X as CloseIcon,
  Video,
  Calendar as CalendarIcon,
  Flame,
} from 'lucide-react'
import { cn } from '#/lib/utils'

interface ChallengeCalendarProps {
  days: DashboardView['days']
  dailyStakeAmount: number
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function ChallengeCalendar({ days, dailyStakeAmount }: ChallengeCalendarProps) {
  // Map days by their localDate string (YYYY-MM-DD)
  const dayMap = useMemo(() => {
    const map = new Map<string, DashboardView['days'][number]>()
    for (const d of days) {
      map.set(d.localDate, d)
    }
    return map
  }, [days])

  // Initial month: find the open today day or latest active day, otherwise current date
  const initialDate = useMemo(() => {
    const pendingDay = days.find((d) => d.status === 'pending')
    if (pendingDay) {
      const [y, m] = pendingDay.localDate.split('-').map(Number)
      return new Date(y, m - 1, 1)
    }
    if (days.length > 0) {
      const [y, m] = days[0].localDate.split('-').map(Number)
      return new Date(y, m - 1, 1)
    }
    return new Date()
  }, [days])

  const [currentDate, setCurrentDate] = useState<Date>(initialDate)

  // Today string in local time
  const todayStr = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [])

  // Default selected date to today or pending day
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const pendingDay = days.find((d) => d.status === 'pending')
    if (pendingDay) return pendingDay.localDate
    const todayMatch = days.find((d) => d.localDate === todayStr)
    if (todayMatch) return todayStr
    return days[0]?.localDate ?? todayStr
  })

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
    currentDate,
  )

  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const handleJumpToToday = () => {
    const now = new Date()
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDateStr(todayStr)
  }

  // Days in this month
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate()

  // First day offset (0 for Mon, 6 for Sun)
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7

  // Summary stats
  const completedCount = useMemo(() => days.filter((d) => d.status === 'completed').length, [days])

  const selectedDayItem = selectedDateStr ? dayMap.get(selectedDateStr) : null

  return (
    <Card className="overflow-hidden border border-[#0d1b2a14] bg-white p-5 sm:p-7 shadow-xs space-y-5">
      {/* Calendar Header with Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#0d1b2a10] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#2b66f2]">
              Consistency Calendar
            </span>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[0.65rem] font-bold text-emerald-800">
              {completedCount} / {days.length} Completed
            </span>
          </div>
          <h2 className="mt-1 font-display text-2xl font-extrabold text-[#0d1b2a] tracking-tight">
            {monthName}
          </h2>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleJumpToToday}
            className="text-xs font-bold px-3 py-1 h-8 cursor-pointer"
          >
            Today
          </Button>

          <div className="flex items-center gap-1 rounded-xl border border-[#0d1b2a14] bg-[#faf8f5] p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="grid size-7 place-items-center rounded-lg text-[#0d1b2a] hover:bg-white hover:shadow-2xs transition-all cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="grid size-7 place-items-center rounded-lg text-[#0d1b2a] hover:bg-white hover:shadow-2xs transition-all cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Row */}
      <div className="grid grid-cols-7 gap-1 text-center font-mono text-[0.7rem] font-bold uppercase tracking-wider text-[#5a6678]">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Month Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {/* Empty padding cells for start of month */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square opacity-0 pointer-events-none" />
        ))}

        {/* Days in Month */}
        {Array.from({ length: totalDaysInMonth }).map((_, i) => {
          const dayNumber = i + 1
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
          const challengeDay = dayMap.get(dateStr)
          const isSelected = selectedDateStr === dateStr
          const isToday = todayStr === dateStr

          let statusStyle = 'text-[#5a6678]/40 hover:bg-[#faf8f5]'
          let statusBadgeIcon = null

          if (challengeDay) {
            switch (challengeDay.status) {
              case 'completed':
                statusStyle = 'bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-2xs'
                statusBadgeIcon = <Check className="size-2.5 stroke-[3]" />
                break
              case 'pending':
                statusStyle =
                  'bg-[#2b66f2] text-white font-bold ring-2 ring-[#2b66f2]/40 shadow-xs animate-pulse hover:bg-[#2052c9]'
                statusBadgeIcon = <Flame className="size-2.5 text-amber-300" />
                break
              case 'forfeited':
                statusStyle = 'bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-2xs'
                statusBadgeIcon = <CloseIcon className="size-2.5 stroke-[3]" />
                break
              case 'locked':
                statusStyle =
                  'border border-[#0d1b2a14] bg-white text-[#0d1b2a] font-semibold hover:border-[#2b66f2]/50 hover:bg-[#faf8f5]'
                break
            }
          }

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => setSelectedDateStr(dateStr)}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center rounded-xl sm:rounded-2xl text-xs sm:text-sm transition-all duration-150 cursor-pointer active:scale-95',
                statusStyle,
                isSelected && 'ring-2 ring-offset-2 ring-[#0d1b2a] z-10',
                isToday && !challengeDay && 'font-bold underline decoration-[#2b66f2]',
              )}
            >
              <span className="leading-none">{dayNumber}</span>
              {statusBadgeIcon ? (
                <span className="absolute bottom-1 sm:bottom-1.5">{statusBadgeIcon}</span>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* Selected Day Detail Card */}
      {selectedDayItem ? (
        <div className="rounded-2xl border border-[#0d1b2a10] bg-[#faf8f5] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#2b66f2]">
                Day {selectedDayItem.dayNumber}
              </span>
              <span className="text-xs text-[#0d1b2a20]">·</span>
              <span className="font-display text-sm font-bold text-[#0d1b2a]">
                {new Intl.DateTimeFormat('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }).format(new Date(selectedDayItem.localDate + 'T12:00:00'))}
              </span>
            </div>

            <p className="text-xs text-[#5a6678]">
              {selectedDayItem.status === 'completed' &&
                `✓ Verified on camera — ${formatUSD(dailyStakeAmount)} secured in won-back escrow.`}
              {selectedDayItem.status === 'pending' &&
                `● Window open today — Record before midnight to protect your ${formatUSD(dailyStakeAmount)} stake!`}
              {selectedDayItem.status === 'forfeited' &&
                `✕ Workout missed — ${formatUSD(dailyStakeAmount)} forfeited to escrow.`}
              {selectedDayItem.status === 'locked' &&
                `○ Upcoming commitment day — Opens automatically at 12:00 AM local time.`}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Badge
              variant={
                selectedDayItem.status === 'completed'
                  ? 'success'
                  : selectedDayItem.status === 'pending'
                    ? 'default'
                    : selectedDayItem.status === 'forfeited'
                      ? 'destructive'
                      : 'outline'
              }
            >
              {selectedDayItem.status === 'completed'
                ? 'Completed'
                : selectedDayItem.status === 'pending'
                  ? 'Open Today'
                  : selectedDayItem.status === 'forfeited'
                    ? 'Forfeited'
                    : 'Locked'}
            </Badge>

            {selectedDayItem.status === 'pending' ? (
              <Link
                to="/record"
                className="btn-quippy py-1.5 px-3 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Video className="size-3.5" /> Record Now
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#0d1b2a14] p-3 text-center text-xs text-[#5a6678]">
          <CalendarIcon className="size-3.5 inline mr-1 text-[#5a6678]" />
          Select any highlighted calendar day to inspect its verification status and daily stake.
        </div>
      )}

      {/* Status Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-2 border-t border-[#0d1b2a10] text-[0.72rem] font-bold text-[#5a6678]">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-600" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#2b66f2]" />
          <span>Open Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-rose-500" />
          <span>Forfeited</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border border-[#0d1b2a18] bg-white" />
          <span>Upcoming</span>
        </div>
      </div>
    </Card>
  )
}
