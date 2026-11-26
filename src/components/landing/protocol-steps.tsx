import { Lock, Camera, Banknote } from 'lucide-react'

const STEPS = [
  {
    number: '01',
    icon: Lock,
    title: 'The Escrow Deposit',
    description:
      'Set your daily stake, duration, and exercise. Deposit the full pot upfront into audited merchant escrow. No recurring subscription, no dark patterns. Real money on the line creates immediate, visceral psychological urgency.',
    badge: 'Step 1: Stake',
  },
  {
    number: '02',
    icon: Camera,
    title: 'The Optical Proof',
    description:
      'Step in front of your camera for your daily prescription. Real-time joint kinematics verify full depth and posture, while Presage SmartSpectra™ measures resting-to-peak cardiovascular surge to prove living human effort.',
    badge: 'Step 2: Execute',
  },
  {
    number: '03',
    icon: Banknote,
    title: 'The Instant Refund',
    description:
      'Complete your sets before the midnight cutoff to lock that day’s stake into your Won-Back balance. When your commitment concludes, a single automated settlement refunds every dollar you won back directly to your card.',
    badge: 'Step 3: Reclaim',
  },
]

export function ProtocolSteps() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="eyebrow">The Mechanics</p>
          <h2 className="mt-2 font-display text-3xl font-medium text-bone sm:text-5xl">
            How The Protocol Operates
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted">
            Designed for those tired of broken promises and unused gym memberships. Zero gray areas.
            Complete the workout, keep your money.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map((step) => {
            const Icon = step.icon
            return (
              <div
                key={step.number}
                className="relative flex flex-col justify-between rounded-xl border border-line/60 bg-panel/40 p-8 transition-colors hover:border-rust/40 backdrop-blur-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-3xl font-bold text-rust/40">{step.number}</span>
                    <span className="rounded bg-void/80 border border-line/50 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                      {step.badge}
                    </span>
                  </div>

                  <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-lg border border-rust/30 bg-rust/10 text-rust">
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="mt-6 font-display text-2xl font-medium text-bone">{step.title}</h3>

                  <p className="mt-3 text-sm leading-relaxed text-muted">{step.description}</p>
                </div>

                <div className="mt-8 border-t border-line/40 pt-4">
                  <div className="h-0.5 w-12 bg-rust/60" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
