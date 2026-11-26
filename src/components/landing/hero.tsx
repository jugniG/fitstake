import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, CheckCircle2, Shield, X } from 'lucide-react'
import { BrandMark } from '#/components/brand-mark'

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-16 md:pt-24 md:pb-24">
      {/* Warm glow background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_80%_10%,rgba(43,102,242,0.12),transparent_60%)] opacity-70"
      />

      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
          {/* Left Column Text */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2b66f2]/20 bg-[#2b66f2]/5 px-4 py-1.5 text-xs font-bold text-[#0d1b2a] shadow-xs">
              <span className="size-2 rounded-full bg-[#2b66f2] animate-pulse" />
              <span>
                Finally, a fitness app that actually gives you a fit body by the end of the year.
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[#0d1b2a] sm:text-6xl lg:text-7xl leading-[1.08] sm:leading-[1.04]">
              You skip because
              <br />
              there’s <span className="serif text-[#2b66f2]">zero consequence.</span>
            </h1>

            <ul className="mt-6 w-full max-w-lg space-y-3 text-left text-sm font-medium text-[#0d1b2a] sm:text-base">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#2b66f2]/10 text-[#2b66f2]">
                  <Check className="size-3.5 stroke-[2.5]" />
                </span>
                <span>
                  <strong>Deposit money</strong> according to what your pocket allows.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#2b66f2]/10 text-[#2b66f2]">
                  <Check className="size-3.5 stroke-[2.5]" />
                </span>
                <span>
                  <strong>Perform exercises in front of camera daily</strong>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
                  <Check className="size-3.5 stroke-[2.5]" />
                </span>
                <span>
                  <strong>Get your deposit refunded</strong> every single day you complete.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-rose-500/15 text-rose-600">
                  <X className="size-3.5 stroke-[2.5]" />
                </span>
                <span className="text-rose-600 font-semibold">
                  Feeling lazy and wanna skip? You will lose your money.
                </span>
              </li>
            </ul>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                to="/login"
                className="btn-quippy inline-flex items-center gap-2 px-6 py-3 text-sm font-bold sm:text-base"
              >
                Get Started <ArrowRight className="size-4" />
              </Link>
              <a
                href="#in-short"
                className="btn-quippy-secondary inline-flex items-center gap-2 px-6 py-3 text-sm font-bold sm:text-base"
              >
                Learn the science <ArrowRight className="size-4" />
              </a>
            </div>

            <p className="mt-4 text-xs font-medium text-[#5a6678]">
              Start free · Set up in 2 minutes · 100% On-device privacy
            </p>
          </div>

          {/* Right Column Interactive Preview Card */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="animate-float animate-card-glow relative rounded-3xl border border-[#0d1b2a14] bg-white p-6 shadow-xl transition-all duration-300">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-[#0d1b2a10] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-9 place-items-center rounded-xl bg-[#eef3fb] text-[#2b66f2] font-bold text-xs shadow-xs">
                    <BrandMark className="size-5 text-[#2b66f2]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0d1b2a]">Deep Squats Challenge</h3>
                    <p className="text-xs text-[#5a6678]">3 sets × 15 reps · Day 4 of 14</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  Active
                </span>
              </div>

              {/* Simulated Camera Window */}
              <div className="relative mt-5 aspect-4/3 overflow-hidden rounded-2xl bg-[#0d1b2a] p-4 text-white flex flex-col justify-between shadow-inner">
                {/* Overlay Top Bar */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 backdrop-blur-md font-mono">
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>VISION HUD</span>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-md font-mono text-rose-300 font-bold">
                    ❤️ 136 BPM
                  </div>
                </div>

                {/* Simulated Pose Skeleton Visual */}
                <div className="my-auto text-center">
                  <div className="inline-block rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 backdrop-blur-xs">
                    <p className="font-mono text-xs font-bold text-emerald-300">
                      ✓ Parallel Depth: Knee Angle 96°
                    </p>
                    <p className="mt-0.5 font-mono text-[0.65rem] text-slate-300">
                      Heart Rate Effort: Aerobic Zone
                    </p>
                  </div>
                </div>

                {/* Overlay Bottom Bar */}
                <div className="flex items-center justify-between rounded-lg bg-black/60 px-3 py-1.5 text-xs font-mono backdrop-blur-md">
                  <span>SET: 2/3 · REP: 12/15</span>
                  <span className="text-emerald-400">100% PRIVATE (ON-DEVICE)</span>
                </div>
              </div>

              {/* Stakes & Won-Back Ledger Preview */}
              <div className="mt-5 grid grid-cols-2 gap-3 text-left">
                <div className="rounded-2xl border border-[#0d1b2a10] bg-[#faf8f5] p-3.5">
                  <span className="text-[0.7rem] font-bold uppercase tracking-wider text-[#5a6678]">
                    Daily Stake
                  </span>
                  <p className="font-mono text-xl font-bold text-[#0d1b2a] mt-0.5">$10.00</p>
                  <p className="text-[0.65rem] text-[#5a6678] mt-0.5">At risk before midnight</p>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                  <span className="text-[0.7rem] font-bold uppercase tracking-wider text-emerald-800">
                    Won-Back Vault
                  </span>
                  <p className="font-mono text-xl font-bold text-emerald-700 mt-0.5">$40.00</p>
                  <p className="text-[0.65rem] text-emerald-800/80 mt-0.5">
                    100% refundable at end
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-[#5a6678] pt-2 border-t border-[#0d1b2a10]">
                <span className="flex items-center gap-1.5 font-medium">
                  <Shield className="size-3.5 text-[#2b66f2]" /> Real-time Effort & Form Check
                </span>
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <CheckCircle2 className="size-3.5" /> Zero Video Saved
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
