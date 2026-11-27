import { useEffect, useRef, useState } from 'react'
import { cn } from '#/lib/utils'
import { HEAT_GRADIENT, PushUpFigure, heatColor } from './push-up-figure'

// One loop: the days count from 1 to 365 while the push-ups get faster as the year goes on,
// then "Consistency over intensity." lands and the loop restarts.
const COUNT_MS = 5000
const HOLD_MS = 2400
const LAST_DAY = 365
// >1 starts slow and accelerates: day 1, 2, 3… then weeks, then months fly by.
const EASE_POWER = 2.2
// Rep length goes from a slow, deliberate rep on day 1 to a blur by the end of the year.
const SLOWEST_REP_MS = 1300
const FASTEST_REP_MS = 320

// Spread out along the bar: Week 1 (2%) sat on top of Month 1 (8%), so it was dropped.
const MILESTONES = [
  { day: 30, label: 'Month 1' },
  { day: 100, label: 'Day 100' },
  { day: 182, label: '6 Months' },
  { day: 365, label: '1 Year' },
]

type Frame = { day: number; depth: number; speed: number; bump: number }

const INITIAL: Frame = { day: 1, depth: 0, speed: 0, bump: 0 }

export function ConsistencyLoop() {
  const [frame, setFrame] = useState<Frame>(INITIAL)
  const lastRep = useRef(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFrame({ day: LAST_DAY, depth: 0, speed: 0, bump: 0 })
      return
    }

    let raf = 0
    let previous = performance.now()
    let cycleStart = previous
    // Accumulated rep phase, so speeding up never makes the figure jump mid-rep.
    let repPhase = 0
    let bump = 0

    const tick = (now: number) => {
      const dt = now - previous
      previous = now

      let elapsed = now - cycleStart
      if (elapsed >= COUNT_MS + HOLD_MS) {
        cycleStart = now
        elapsed = 0
        repPhase = 0
      }

      const progress = Math.min(1, elapsed / COUNT_MS)
      const counting = elapsed < COUNT_MS
      const day = Math.max(1, Math.round(1 + (LAST_DAY - 1) * progress ** EASE_POWER))
      const speed = counting ? progress : 0
      const repMs = SLOWEST_REP_MS - (SLOWEST_REP_MS - FASTEST_REP_MS) * speed

      // During the hold, the figure finishes its rep and rests at the top.
      if (counting || repPhase % 1 !== 0) {
        const next = repPhase + dt / repMs
        repPhase = counting ? next : Math.min(Math.ceil(repPhase), next)
      }
      const depth = (1 - Math.cos((repPhase % 1) * 2 * Math.PI)) / 2

      // A pop on the counter each time a rep completes.
      const completed = Math.floor(repPhase)
      if (completed !== lastRep.current) {
        lastRep.current = completed
        bump = 1
      }
      bump = Math.max(0, bump - dt / 220)

      setFrame({ day, depth, speed, bump })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const { day, depth, speed, bump } = frame
  const done = day >= LAST_DAY
  const progress = day / LAST_DAY
  // Keep the riding label inside the bar's width at both ends.
  const labelLeft = Math.min(91, Math.max(9, progress * 100))

  return (
    <div
      role="img"
      aria-label="Push-ups every day from day 1 to day 365, getting faster as the year goes on. Consistency over intensity."
      className="relative"
    >
      <div aria-hidden="true" className="relative flex flex-col items-center">
        <PushUpFigure depth={depth} speed={speed} className="relative -my-10 w-full max-w-md" />

        <p
          className={cn(
            'relative mt-2 text-center font-display text-3xl font-black tracking-tight text-[#0d1b2a] transition-all duration-500 sm:text-4xl',
            done ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          )}
        >
          <span className="text-[#2b66f2]">Consistency</span> over intensity.
        </p>

        {/* Horizontal progress through the year, with the day count riding its leading edge. */}
        <div className="relative mt-6 w-full max-w-md">
          <div className="relative h-9">
            <div className="absolute bottom-1 -translate-x-1/2" style={{ left: `${labelLeft}%` }}>
              <span
                className="block rounded-full bg-[#0d1b2a] px-3 py-1 font-mono text-sm font-bold whitespace-nowrap tabular-nums text-white shadow-[0_6px_16px_rgba(13,27,42,0.25)]"
                style={{ transform: `scale(${1 + bump * 0.05})` }}
              >
                Day {day}
              </span>
              <span className="mx-auto block size-0 border-x-[5px] border-t-[5px] border-x-transparent border-t-[#0d1b2a]" />
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#0d1b2a14]">
            {/* The gradient is sized to the full bar and revealed as it fills, so each colour
                appears at its point in the year instead of stretching with the fill. */}
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress * 100}%`,
                backgroundImage: HEAT_GRADIENT,
                backgroundSize: `${100 / Math.max(progress, 0.001)}% 100%`,
                boxShadow: `0 0 ${4 + progress * 10}px ${heatColor(progress, 0.45)}`,
              }}
            />
          </div>
          <div className="relative mt-2.5 h-4">
            {MILESTONES.map((milestone) => {
              const reached = day >= milestone.day
              const left = (milestone.day / LAST_DAY) * 100
              return (
                <span
                  key={milestone.day}
                  className={cn(
                    'absolute top-0 font-mono text-[0.65rem] font-bold whitespace-nowrap transition-colors',
                    reached ? 'text-[#0d1b2a]' : 'text-[#0d1b2a]/30',
                    milestone.day === LAST_DAY ? '-translate-x-full' : '-translate-x-1/2',
                  )}
                  style={{ left: `${left}%` }}
                >
                  {milestone.label}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
