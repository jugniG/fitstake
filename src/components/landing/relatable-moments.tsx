import { Moon, CreditCard, Dumbbell } from 'lucide-react'

const SCENARIOS = [
  {
    icon: Moon,
    iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    tag: 'The "Tomorrow" Delusion',
    time: '8:45 PM',
    quote:
      '“Exhausted from back-to-back meetings today. I’ll wake up at 6:30 AM tomorrow and do double the workout.”',
    reality:
      'You hit snooze four times. By 7:45 AM you’re scrambling for coffee. The workout never happened.',
  },
  {
    icon: CreditCard,
    iconColor: 'text-amber-600 bg-amber-50 border-amber-100',
    tag: 'The Ghost Subscription',
    time: 'Monthly Auto-Debit',
    quote: '“A payment of $65 was debited for your annual gym membership subscription.”',
    reality:
      'You haven’t touched a dumbbell in their facility since two months ago, but the payment quietly goes out anyway.',
  },
  {
    icon: Dumbbell,
    iconColor: 'text-rose-600 bg-rose-50 border-rose-100',
    tag: 'The Honor System Fail',
    time: 'Any Given Day',
    quote:
      '“I downloaded a workout app and promised myself I would do 20 pushups every single day.”',
    reality:
      'When you skip, the app sends a polite push notification. You swipe it away. Skipping costs you $0 in the moment.',
  },
]

export function RelatableMoments() {
  return (
    <section id="scenarios" className="border-y border-[#0d1b2a14] bg-white/60 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-block rounded-full bg-[#eef3fb] px-3.5 py-1 text-xs font-bold tracking-wider text-[#5a6678] uppercase">
            Relatable moments
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0d1b2a] sm:text-4xl">
            Do any of these sound familiar?
          </h2>
          <p className="mt-2 text-sm text-[#5a6678] sm:text-base">
            If these scenes feel uncomfortably relatable, you&apos;re in the right place.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SCENARIOS.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="card-hover-lift group relative flex flex-col justify-between rounded-3xl border border-[#0d1b2a14] bg-white p-6 shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between rounded-2xl bg-[#faf8f5] p-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`grid size-8 place-items-center rounded-xl border ${item.iconColor}`}
                      >
                        <Icon className="size-4" />
                      </div>
                      <span className="text-xs font-bold text-[#0d1b2a]">{item.tag}</span>
                    </div>
                    <span className="font-mono text-[0.65rem] font-bold text-[#5a6678]">
                      {item.time}
                    </span>
                  </div>

                  <p className="mt-5 text-sm italic leading-relaxed text-[#0d1b2a] font-medium">
                    {item.quote}
                  </p>
                </div>

                <div className="mt-6 border-t border-[#0d1b2a10] pt-4">
                  <p className="text-xs leading-relaxed text-[#5a6678]">
                    <span className="font-bold text-[#0d1b2a]">The Reality: </span>
                    {item.reality}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
