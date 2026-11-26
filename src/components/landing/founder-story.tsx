import { Flame, CheckCircle2 } from 'lucide-react'

export function FounderStory() {
  return (
    <section className="relative border-y border-[#0d1b2a14] bg-white/70 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-5">
        <div className="card-hover-lift relative rounded-3xl border border-[#0d1b2a14] bg-white p-7 sm:p-10 shadow-xs">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0d1b2a10] pb-6">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-[#2b66f2] font-mono text-base font-bold text-white shadow-xs">
                SG
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#0d1b2a]">Sahil Gupta</h3>
                  <span className="rounded-full bg-[#eef3fb] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-[#2b66f2]">
                    Founder
                  </span>
                </div>
                <p className="text-xs text-[#5a6678]">Built out of personal frustration</p>
              </div>
            </div>

            {/* Streak Badge */}
            <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-800">
              <Flame className="size-4 text-amber-600 animate-bounce" />
              <span>Personal Streak: Day 10 (40 pushups + 30 squats)</span>
            </div>
          </div>

          {/* Story Body */}
          <div className="mt-6 space-y-4 text-base leading-relaxed text-[#5a6678]">
            <p className="text-lg sm:text-xl font-extrabold text-[#0d1b2a]">
              “I didn’t build this to be a fitness influencer. I built it because I couldn’t stop
              procrastinating in my own room.”
            </p>

            <p>
              Almost all of my work happens on a laptop, sitting in one room for 10+ hours a day. I
              knew I needed to exercise, but being a natural procrastinator, I kept endlessly
              deferring it.{' '}
              <em>
                “I’ll do it after this commit.” “I’ll do it at 9:00 PM.” “Starting fresh Monday.”
              </em>
            </p>

            <p>
              The brutal truth? When you work from a desk, there is zero immediate consequence to
              skipping a workout. Free motivation dies the instant you feel slightly tired.
            </p>

            <p>
              So I built StakeFit to engineer unbreakable consistency through financial stakes. It
              completely removed the daily mental debate of whether I “feel like” working out. It’s
              now been <strong className="text-[#0d1b2a]">10 consecutive days</strong> of pure,
              unbroken consistency—knocking out{' '}
              <strong className="text-[#0d1b2a]">40 push-ups + 30 squats every single day</strong>{' '}
              right in front of my webcam without a single skip.
            </p>

            <p>
              I don’t even go to a gym. Everything happens in my room in 15 minutes. That’s the
              secret to staying consistent: zero commute friction combined with a hard midnight
              deadline. Knowing that procrastinating past midnight forfeits real cash turns daily
              fitness from a willpower struggle into an automatic, non-negotiable daily reflex.
            </p>
          </div>

          {/* Footer takeaway */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#faf8f5] p-4 text-xs">
            <span className="font-semibold text-[#0d1b2a]">
              No gym required. No commute. Just your laptop camera and skin in the game.
            </span>
            <span className="flex items-center gap-1.5 font-mono font-bold text-emerald-700">
              <CheckCircle2 className="size-4" /> 100% of stakes defended
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
