import { TrendingDown, Laptop, ShieldCheck } from 'lucide-react'

const PILLARS = [
  {
    tag: '01 / THE PSYCHOLOGY',
    title: 'The Loss Aversion Engine',
    description:
      'Nobel Prize-winning research proves humans fight 2.5× harder to prevent losing $10 than they do to earn an abstract future reward. Putting your own money at risk turns vague good intentions into an undeniable daily must.',
    icon: TrendingDown,
  },
  {
    tag: '02 / THE CONVENIENCE',
    title: 'The Zero-Friction Studio',
    description:
      'Packing gym clothes, driving in traffic, and waiting for equipment adds 45 minutes of mental friction before you even lift a weight. StakeFit runs on your laptop webcam. Turn it on in your living room and finish in 15 minutes.',
    icon: Laptop,
  },
  {
    tag: '03 / THE INTEGRITY',
    title: 'Honest Camera Verification',
    description:
      'No self-reported honor system. On-device camera tracking verifies your exercise form and checks real physical effort, so you can never cheat yourself.',
    icon: ShieldCheck,
  },
]

export function ScienceSection() {
  return (
    <section id="science" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-block rounded-full bg-[#eef3fb] px-3.5 py-1 text-xs font-bold tracking-wider text-[#5a6678] uppercase">
            The Behavioral Science
          </p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#0d1b2a] sm:text-5xl leading-tight">
            You don’t have a discipline problem.
            <br />
            <span className="serif text-[#2b66f2]">You have a consequence problem.</span>
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#5a6678] sm:text-lg">
            Human psychology is hardwired to seek immediate comfort when there is no tangible
            penalty for skipping. Loss aversion flips this wiring: risking your own hard-earned
            money on the line creates visceral urgency that crushes procrastination every single
            day.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {PILLARS.map((p, idx) => {
            const Icon = p.icon
            return (
              <div
                key={idx}
                className="card-hover-lift relative flex flex-col justify-between rounded-3xl border border-[#0d1b2a14] bg-white p-7 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#2b66f2] uppercase tracking-wider">
                      {p.tag}
                    </span>
                    <div className="grid size-9 place-items-center rounded-xl bg-[#eef3fb] text-[#2b66f2]">
                      <Icon className="size-4" />
                    </div>
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-[#0d1b2a]">{p.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#5a6678]">{p.description}</p>
                </div>

                <div className="mt-6 border-t border-[#0d1b2a10] pt-4">
                  <div className="h-1 w-10 rounded-full bg-[#2b66f2]" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
