import { Zap, Moon, CalendarCheck, Wallet, Trophy } from 'lucide-react'

const PILLARS = [
  {
    title: 'Posture & Energy',
    desc: 'Undo 8 hours of desk-slouching and neck strain with daily compound movement.',
    icon: Zap,
    color: 'text-amber-500 bg-amber-50 border-amber-100',
  },
  {
    title: 'Deep Restful Sleep',
    desc: 'Fall asleep in under 15 minutes driven by genuine physical fatigue rather than racing thoughts.',
    icon: Moon,
    color: 'text-indigo-500 bg-indigo-50 border-indigo-100',
  },
  {
    title: 'Iron Consistency',
    desc: 'Build an unbroken 14 to 30-day streak that operates on automatic discipline, not fleeting mood.',
    icon: CalendarCheck,
    color: 'text-emerald-500 bg-emerald-50 border-emerald-100',
  },
  {
    title: '100% Financial Return',
    desc: 'Defend your stakes day by day. Every single dollar you pledged is refunded to your card upon completion.',
    icon: Wallet,
    color: 'text-blue-500 bg-blue-50 border-blue-100',
  },
  {
    title: 'Quiet Self-Respect',
    desc: 'The unshakeable internal confidence that when you give yourself your word, you keep it.',
    icon: Trophy,
    color: 'text-purple-500 bg-purple-50 border-purple-100',
  },
]

export function LifeReclaimed() {
  return (
    <section id="reclaim" className="border-t border-[#0d1b2a14] bg-[#faf8f5] py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-block rounded-full bg-[#eef3fb] px-3.5 py-1 text-xs font-bold tracking-wider text-[#5a6678] uppercase">
            Life reclaimed
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0d1b2a] sm:text-4xl">
            What Habit-Stakes helps you reclaim.
          </h2>
          <p className="mt-2 text-sm text-[#5a6678] sm:text-base">
            Five daily areas permanently transformed when your word is backed by stakes.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {PILLARS.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-3xl border border-[#0d1b2a14] bg-white p-5 shadow-xs transition-all hover:border-[#2b66f2]/40 hover:shadow-md"
              >
                <div>
                  <div
                    className={`grid size-10 place-items-center rounded-2xl border ${item.color}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-[#0d1b2a]">{item.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5a6678]">{item.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
