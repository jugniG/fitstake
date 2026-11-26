const TIMELINE = [
  {
    day: 'Day 00',
    title: 'Broken Routine & Guilt',
    badge: 'Right Now',
    desc: 'Occasional workouts followed by weeks of inactivity. Gym fees auto-debiting with nothing to show for them.',
  },
  {
    day: 'Day 03',
    title: 'First Stake Defended',
    badge: 'Skin in the Game',
    desc: 'The physical shock of money on the line gets you onto the mat. You finish 3 sets before the midnight cutoff.',
  },
  {
    day: 'Day 07',
    title: 'Friction Evaporates',
    badge: 'Zero Debate',
    desc: 'You no longer debate whether you "feel like working out." 7:00 PM hits, camera opens, reps get done in 15 mins.',
  },
  {
    day: 'Day 14',
    title: 'Visible Kinetic Flow',
    badge: 'Posture Shift',
    desc: 'Squat depth hits parallel smoothly. SmartSpectra logs higher cardiovascular recovery drop. Energy surges.',
  },
  {
    day: 'Day 21',
    title: 'Neurological Lock-In',
    badge: 'Habit Formed',
    desc: 'Skipping is no longer a temptation. The psychological need to procrastinate on fitness has been permanently broken.',
  },
  {
    day: 'Day 30',
    title: '100% Refund Settled',
    badge: 'Victory',
    desc: 'Final day verified. One settlement refund returns every dollar of your deposit to your bank account. Consistency won.',
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
