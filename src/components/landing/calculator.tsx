import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Flame, Check, ShieldAlert, ArrowRight } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { formatUSD } from '#/lib/format'

const DAILY_STAKE_OPTIONS = [5, 10, 20, 50, 100]
const DURATION_OPTIONS = [7, 14, 21, 30]

const EXERCISES = [
  { id: 'squat', name: 'Deep Squats', prescription: '3 sets × 15 reps' },
  { id: 'push_up', name: 'Chest Push-ups', prescription: '3 sets × 10 reps' },
  { id: 'jumping_jack', name: 'Jumping Jacks', prescription: '3 sets × 20 reps' },
] as const

export function StakesCalculator() {
  const [dailyStake, setDailyStake] = useState<number>(10)
  const [durationDays, setDurationDays] = useState<number>(14)
  const [exercise, setExercise] = useState<(typeof EXERCISES)[number]>(EXERCISES[0])

  const totalCommitted = dailyStake * durationDays

  return (
    <section
      id="calculator"
      className="scroll-mt-20 py-16 sm:py-24 border-t border-line/40 bg-pitch/40"
    >
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <p className="eyebrow">Financial Accountability</p>
          <h2 className="mt-2 font-display text-3xl font-medium text-bone sm:text-5xl">
            Simulate Your Stakes
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted">
            The psychology is simple: loss aversion is 2.5× stronger than the promise of reward.
            Choose your terms and see how much you will defend.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
          {/* Controls column */}
          <div className="space-y-6 lg:col-span-7 rounded-xl border border-line bg-panel/60 p-6 sm:p-8 backdrop-blur-xs">
            {/* Daily Stake Selection */}
            <div>
              <label className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-muted">
                <span>Daily Stake Amount</span>
                <span className="text-sm font-bold text-bone">{formatUSD(dailyStake)} / day</span>
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {DAILY_STAKE_OPTIONS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setDailyStake(amount)}
                    className={`rounded-md border px-4 py-2 font-mono text-sm transition-all ${
                      dailyStake === amount
                        ? 'border-rust bg-rust/20 font-semibold text-bone shadow-xs'
                        : 'border-line/70 bg-void/50 text-muted hover:border-line hover:text-bone'
                    }`}
                  >
                    {formatUSD(amount)}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Selection */}
            <div>
              <label className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-muted">
                <span>Commitment Duration</span>
                <span className="text-sm font-bold text-bone">{durationDays} consecutive days</span>
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDurationDays(days)}
                    className={`rounded-md border px-4 py-2 font-mono text-sm transition-all ${
                      durationDays === days
                        ? 'border-rust bg-rust/20 font-semibold text-bone shadow-xs'
                        : 'border-line/70 bg-void/50 text-muted hover:border-line hover:text-bone'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Exercise Selection */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-muted">
                Pledged Movement
              </label>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {EXERCISES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setExercise(item)}
                    className={`flex flex-col items-start rounded-md border p-3 text-left transition-all ${
                      exercise.id === item.id
                        ? 'border-rust bg-rust/20 text-bone'
                        : 'border-line/70 bg-void/50 text-muted hover:border-line hover:text-bone'
                    }`}
                  >
                    <span className="text-xs font-semibold">{item.name}</span>
                    <span className="mt-1 font-mono text-[0.65rem] text-faint">
                      {item.prescription}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Outcome Summary Card */}
          <div className="lg:col-span-5 rounded-xl border border-rust/40 bg-gradient-to-b from-panel-raised to-panel p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between border-b border-line/60 pb-4">
              <span className="text-xs font-mono uppercase tracking-widest text-rust">
                Contract Summary
              </span>
              <span className="flex items-center gap-1 rounded bg-rust/10 px-2 py-0.5 font-mono text-[0.65rem] text-rust font-semibold">
                <Flame className="h-3 w-3" /> High Stakes
              </span>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs text-muted">Total Deposit Required</p>
                <p className="font-mono text-4xl font-bold tracking-tight text-bone">
                  {formatUSD(totalCommitted)}
                </p>
                <p className="mt-1 text-[0.7rem] text-faint">
                  Charged once upfront via Kelviq secure escrow checkout.
                </p>
              </div>

              <div className="rounded-lg border border-line/60 bg-void/60 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Daily Won-Back Rate:</span>
                  <span className="font-mono font-medium text-emerald-400">
                    +{formatUSD(dailyStake)} / day
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Max 100% Refund:</span>
                  <span className="font-mono font-medium text-bone">
                    {formatUSD(totalCommitted)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Cost If You Honor It:</span>
                  <span className="font-mono font-bold text-emerald-400">$0.00</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-muted">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>
                    Each day completed on camera locks {formatUSD(dailyStake)} into your Won-Back
                    vault.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <span>
                    Miss the midnight deadline and that day's {formatUSD(dailyStake)} is permanently
                    forfeited.
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link to="/login" className="block w-full">
                  <Button variant="primary" size="lg" className="w-full gap-2 text-sm">
                    Lock In This Commitment <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
