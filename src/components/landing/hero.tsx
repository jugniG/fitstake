import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '#/lib/utils'
import { ConsistencyLoop } from './consistency-loop'

const HOW_IT_WORKS = [
  { title: 'Log in', detail: 'to create your account.', warning: false },
  {
    title: 'Set up your workout plan:',
    detail: 'your exercises and how many days.',
    warning: false,
  },
  {
    title: 'Set up auto-pay for any amount you choose.',
    detail: "That's your daily stake.",
    warning: false,
  },
  {
    title: 'Show up every day.',
    detail: "Miss a day and you're charged that day's stake.",
    warning: true,
  },
]

// A soft cloud made of overlapping blurred puffs, positioned by the className.
function Cloud({ className }: { className: string }) {
  return (
    <div className={cn('absolute aspect-[5/2]', className)}>
      <div className="absolute bottom-0 left-[8%] h-[55%] w-[84%] rounded-full bg-white blur-xl" />
      <div className="absolute bottom-[25%] left-[20%] h-[60%] w-[34%] rounded-full bg-white blur-lg" />
      <div className="absolute bottom-[30%] left-[42%] h-[75%] w-[38%] rounded-full bg-white blur-lg" />
      <div className="absolute bottom-[18%] left-[64%] h-[50%] w-[26%] rounded-full bg-white blur-lg" />
    </div>
  )
}

// One soft sky behind the hero and the founder story, so the two read as a single section:
// pale blue at the top, warm peach in the middle, ending in the page colour. Decorative only.
export function HeroSky({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#d6e8f0_0%,#e6eff0_25%,#f1ece4_55%,#f6efe6_80%,#faf8f5_100%)]" />
        {/* Warm sun glow where the hero meets the founder story */}
        <div className="absolute top-[42%] left-1/2 h-[28rem] w-[60rem] -translate-x-1/2 rounded-[50%] bg-[#f8c9a4]/35 blur-[110px]" />
        <Cloud className="-left-24 top-[20%] w-[26rem] opacity-90" />
        <Cloud className="-left-10 top-[33%] w-[16rem] opacity-70" />
        <Cloud className="-right-28 top-[28%] w-[30rem] opacity-90" />
        <Cloud className="right-[18%] top-[4%] w-[12rem] opacity-50" />
        <Cloud className="-left-20 top-[72%] w-[22rem] opacity-60" />
        <Cloud className="-right-16 top-[82%] w-[18rem] opacity-50" />
      </div>
      {children}
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative pt-16 pb-16 md:pt-24 md:pb-24">

      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
          {/* Left Column Text */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight text-[#0d1b2a] sm:text-6xl lg:text-7xl leading-[1.08] sm:leading-[1.04]">
              Build a great body by working out{' '}
              <span className="serif text-[#2b66f2]">consistently.</span>
            </h1>

            <ol className="mt-8 w-full max-w-lg space-y-3 text-left text-sm font-medium text-[#0d1b2a] sm:text-base">
              {HOW_IT_WORKS.map((step, index) => (
                <li key={step.title} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full font-mono text-[0.7rem] font-bold',
                      step.warning
                        ? 'bg-rose-500/15 text-rose-600'
                        : 'bg-[#2b66f2]/10 text-[#2b66f2]',
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className={step.warning ? 'font-semibold text-rose-600' : undefined}>
                    <strong>{step.title}</strong> {step.detail}
                  </span>
                </li>
              ))}
            </ol>

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
          </div>

          {/* Right column: steady push-ups while the days fly by, day 1 to day 365 */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <ConsistencyLoop />
          </div>
        </div>
      </div>
    </section>
  )
}
