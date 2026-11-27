import { Check, Flame } from 'lucide-react'
import founderPhoto from '#/assets/founder-sahil.jpg'

export function FounderStory() {
  return (
    <section className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-5">
        <div className="card-hover-lift relative rounded-3xl border border-[#0d1b2a14] bg-white p-7 sm:p-10 shadow-xs">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0d1b2a10] pb-6">
            <div className="flex items-center gap-3">
              <img
                src={founderPhoto}
                alt="Sahil Gupta, founder of StakeFit"
                width={44}
                height={44}
                loading="lazy"
                className="size-11 rounded-2xl object-cover shadow-xs ring-1 ring-[#0d1b2a14]"
              />
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
              <Flame className="size-4 text-amber-600 motion-safe:animate-bounce" />
              <span>Personal streak: Day 10 (20 push-ups + 20 squats + 20 leg raises)</span>
            </div>
          </div>

          {/* Story Body */}
          <div className="mt-6 space-y-4 text-base leading-relaxed text-[#5a6678]">
            <p>
              Almost all of my work happens on a laptop, sitting in one room for 10+ hours a day. I
              knew I needed to exercise, but being a natural procrastinator, I kept endlessly
              deferring it.{' '}
              <em>
                “I’ll do it after this commit.” “I’ll do it at 9:00 PM.” “Starting fresh Monday.”
              </em>
            </p>

            <p>
              But since I built StakeFit and started using it, I do{' '}
              <strong className="text-[#0d1b2a]">20 push-ups, 20 squats and 20 leg raises</strong>{' '}
              every day. It’s been{' '}
              <strong className="text-[#0d1b2a]">10 days without skipping a single one.</strong>
            </p>

            <p className="text-lg font-extrabold text-[#0d1b2a] sm:text-xl">
              Just me, my phone, StakeFit and 30 minutes a day.{' '}
              <span className="text-[#2b66f2]">I don’t even go to the gym.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
