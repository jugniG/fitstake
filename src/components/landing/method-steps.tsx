import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, Flame } from 'lucide-react'
import { formatUSD } from '#/lib/format'

const STEPS = [
  {
    num: '01',
    title: 'Choose your daily movement',
    desc: 'Pick deep squats, chest push-ups, or jumping jacks. Daily prescriptions are locked (e.g. 3 sets × 15 reps).',
  },
  {
    num: '02',
    title: 'Stake real skin in the game',
    desc: 'Deposit your daily stake into a secure refund vault. Zero hidden subscriptions or traps.',
  },
  {
    num: '03',
    title: 'Step in front of the lens',
    desc: 'Step in front of your camera. Smart camera tracking counts your reps and checks real effort in 15 minutes at home.',
  },
  {
    num: '04',
    title: 'Beat the midnight cutoff',
    desc: 'Finish all sets before your local midnight. That day’s stake moves immediately into your Won-Back balance.',
  },
  {
    num: '05',
    title: 'Reclaim your cash payout',
    desc: 'At challenge completion, one automated settlement refunds every single dollar you won back to your card.',
  },
]

const STAKE_OPTIONS = [5, 10, 20, 50]
const DURATION_OPTIONS = [7, 14, 21, 30]

export function MethodSteps() {
  const [dailyStake, setDailyStake] = useState<number>(10)
  const [durationDays, setDurationDays] = useState<number>(14)
  const total = dailyStake * durationDays

  return (
    <section id="how-it-works" className="border-t border-[#0d1b2a14] bg-[#faf8f5] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-block rounded-full bg-[#eef3fb] px-3.5 py-1 text-xs font-bold tracking-wider text-[#5a6678] uppercase">
            The 5-Step StakeFit Method
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0d1b2a] sm:text-5xl">
            How the StakeFit method works.
          </h2>
          <p className="mt-3 text-sm text-[#5a6678] sm:text-base">
            From discovering your baseline to staking real skin in the game, optical form checks,
            and reclaiming 100% of your deposit.
          </p>
        </div>

        {/* 5 Steps Grid */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s, idx) => (
            <div
              key={idx}
              className="card-hover-lift flex flex-col justify-between rounded-3xl border border-[#0d1b2a14] bg-white p-5 shadow-xs"
            >
              <div>
                <span className="grid size-9 place-items-center rounded-2xl bg-[#2b66f2] font-mono text-xs font-bold text-white shadow-xs">
                  {s.num}
                </span>
                <h3 className="mt-4 text-base font-bold text-[#0d1b2a]">{s.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#5a6678]">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Embedded Interactive Stakes Calculator Card */}
        <div className="mt-12 rounded-3xl border border-[#0d1b2a14] bg-white p-6 shadow-sm sm:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-xl space-y-6">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 font-mono text-xs font-bold text-amber-800">
                  <Flame className="size-3.5" /> Interactive Stakes Simulator
                </span>
                <h3 className="mt-3 text-2xl font-extrabold text-[#0d1b2a] sm:text-3xl">
                  Simulate your daily stake & refund.
                </h3>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#5a6678]">
                  Daily Stake: {formatUSD(dailyStake)} / day
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {STAKE_OPTIONS.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDailyStake(val)}
                      className={`rounded-xl border px-3.5 py-1.5 font-mono text-xs font-bold transition-all duration-150 active:scale-95 ${
                        dailyStake === val
                          ? 'border-[#2b66f2] bg-[#2b66f2] text-white shadow-xs scale-105'
                          : 'border-[#0d1b2a14] bg-[#faf8f5] text-[#0d1b2a] hover:border-[#2b66f2] hover:bg-white'
                      }`}
                    >
                      {formatUSD(val)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#5a6678]">
                  Challenge Duration: {durationDays} Days
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDurationDays(val)}
                      className={`rounded-xl border px-3.5 py-1.5 font-mono text-xs font-bold transition-all duration-150 active:scale-95 ${
                        durationDays === val
                          ? 'border-[#2b66f2] bg-[#2b66f2] text-white shadow-xs scale-105'
                          : 'border-[#0d1b2a14] bg-[#faf8f5] text-[#0d1b2a] hover:border-[#2b66f2] hover:bg-white'
                      }`}
                    >
                      {val} Days
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Total Stake Preview */}
            <div className="rounded-2xl border border-[#0d1b2a14] bg-[#faf8f5] p-6 lg:min-w-[320px] text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5a6678]">
                Total Upfront Pot
              </span>
              <p className="mt-1 font-mono text-4xl font-extrabold text-[#0d1b2a]">
                {formatUSD(total)}
              </p>
              <p className="mt-1 text-xs text-[#5a6678]">
                {formatUSD(dailyStake)} × {durationDays} days in escrow
              </p>

              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-800">
                <div className="flex items-center gap-1.5 font-bold">
                  <Check className="size-4 shrink-0" /> Won-Back Guarantee:
                </div>
                <p className="mt-1 text-[0.7rem] leading-relaxed">
                  Every day you complete on camera locks {formatUSD(dailyStake)} into your refund
                  vault. Zero cost if you honor your word.
                </p>
              </div>

              <Link
                to="/login"
                className="btn-quippy mt-5 flex items-center justify-center gap-2 py-3 text-sm"
              >
                Lock In This Commitment <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
