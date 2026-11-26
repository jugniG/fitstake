const TIMELINE = [
  {
    day: 'Day 00',
    title: 'Broken Routine & Guilt',
    badge: 'Right Now',
    desc: 'Starting and stopping. Gym fees auto-debiting while you sit on the couch feeling guilty about another skipped workout.',
  },
  {
    day: 'Day 03',
    title: 'First Win in the Books',
    badge: 'Skin in the Game',
    desc: 'Having your own cash on the line gets you off the chair. You open your camera and finish in 15 minutes before bedtime.',
  },
  {
    day: 'Day 07',
    title: 'Zero Mental Debate',
    badge: 'The Shift',
    desc: 'You no longer negotiate with yourself. 7:00 PM hits, you do your reps in your room, and you lock in your daily refund.',
  },
  {
    day: 'Day 14',
    title: 'You Feel the Difference',
    badge: 'Real Momentum',
    desc: 'Squats and push-ups don’t leave you gasping for air anymore. Your clothes fit better, posture improves, and energy stays high all day.',
  },
  {
    day: 'Day 21',
    title: 'It Feels Automatic',
    badge: 'Habit Locked In',
    desc: 'Three straight weeks without skipping a single day. Working out at home feels as natural and non-negotiable as brushing your teeth.',
  },
  {
    day: 'Day 30',
    title: '100% Cash Back in Hand',
    badge: 'Victory',
    desc: 'Challenge complete. Every single dollar of your deposit is refunded straight to your bank card. You built a real habit and kept your money.',
  },
]

export function ProtocolProgression() {
  return (
    <section id="protocol" className="border-t border-[#0d1b2a14] bg-white/70 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-block rounded-full bg-[#eef3fb] px-3.5 py-1 text-xs font-bold tracking-wider text-[#5a6678] uppercase">
            Commitment Protocol
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0d1b2a] sm:text-5xl">
            Accomplish the consistency you&apos;ve dreamed of.
          </h2>
          <p className="mt-3 text-sm text-[#5a6678] sm:text-base">
            A behavioral retraining protocol to permanently break the workout procrastination
            reflex.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TIMELINE.map((step, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-3xl border border-[#0d1b2a14] bg-white p-6 shadow-xs transition-all hover:border-[#2b66f2]/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-bold text-[#2b66f2]">{step.day}</span>
                  <span className="rounded-full bg-[#faf8f5] border border-[#0d1b2a10] px-2.5 py-0.5 font-mono text-[0.65rem] font-bold text-[#5a6678]">
                    {step.badge}
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-bold text-[#0d1b2a]">{step.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#5a6678]">{step.desc}</p>
              </div>

              <div className="mt-6 border-t border-[#0d1b2a10] pt-4">
                <div className="h-1 w-8 rounded-full bg-[#2b66f2]/70" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
