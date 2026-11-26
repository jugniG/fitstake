import { Check, X } from 'lucide-react'

const COMPARISONS = [
  {
    feature: 'Real money on the line (Loss Aversion)',
    hs: 'Yes · Locked in Escrow',
    gym: 'No · Auto-debited regardless',
    apps: 'No · Soft push alerts',
    willpower: 'No · Zero penalty',
  },
  {
    feature: 'Computer vision rep & depth verification',
    hs: true,
    gym: false,
    apps: false,
    willpower: false,
  },
  {
    feature: 'Contactless vitals & HR recovery (Presage)',
    hs: true,
    gym: false,
    apps: false,
    willpower: false,
  },
  {
    feature: '100% Client-side privacy (zero video stored)',
    hs: true,
    gym: 'Public space',
    apps: 'Cloud uploads',
    willpower: true,
  },
  {
    feature: 'Net financial cost if you succeed',
    hs: '$0.00 (100% Refunded)',
    gym: '$600–$1,200/yr lost',
    apps: '$150–$300/yr lost',
    willpower: 'Free (Cost: Inconsistency)',
  },
]

export function ComparisonMatrix() {
  return (
    <section id="compare" className="border-t border-[#0d1b2a14] bg-white/70 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-block rounded-full bg-[#eef3fb] px-3.5 py-1 text-xs font-bold tracking-wider text-[#5a6678] uppercase">
            Comparison
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0d1b2a] sm:text-4xl lg:text-5xl">
            StakeFit does what others can&apos;t.
          </h2>
          <p className="mt-2 text-sm text-[#5a6678] sm:text-base">
            Default fitness apps send polite warnings. StakeFit introduces real psychological
            stakes.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl border border-[#0d1b2a14] bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#0d1b2a14] bg-[#faf8f5] text-xs font-bold text-[#0d1b2a]">
                  <th scope="col" className="p-4 sm:p-5">
                    Feature
                  </th>
                  <th scope="col" className="bg-[#2b66f2]/10 p-4 text-[#2b66f2] sm:p-5 font-bold">
                    StakeFit
                  </th>
                  <th scope="col" className="p-4 text-[#5a6678] sm:p-5">
                    Gym Membership
                  </th>
                  <th scope="col" className="p-4 text-[#5a6678] sm:p-5">
                    Fitness Apps
                  </th>
                  <th scope="col" className="p-4 text-[#5a6678] sm:p-5">
                    Solo Willpower
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0d1b2a10]">
                {COMPARISONS.map((row, idx) => (
                  <tr key={idx} className="transition-colors hover:bg-[#faf8f5]/60">
                    <th scope="row" className="p-4 font-bold text-[#0d1b2a] sm:p-5">
                      {row.feature}
                    </th>
                    <td className="bg-[#2b66f2]/5 p-4 font-bold text-[#2b66f2] sm:p-5">
                      {typeof row.hs === 'boolean' ? (
                        row.hs ? (
                          <Check className="size-4.5 text-[#2b66f2]" />
                        ) : (
                          <X className="size-4.5 text-gray-300" />
                        )
                      ) : (
                        row.hs
                      )}
                    </td>
                    <td className="p-4 text-[#5a6678] sm:p-5">
                      {typeof row.gym === 'boolean' ? (
                        row.gym ? (
                          <Check className="size-4.5 text-emerald-600" />
                        ) : (
                          <X className="size-4.5 text-gray-300" />
                        )
                      ) : (
                        row.gym
                      )}
                    </td>
                    <td className="p-4 text-[#5a6678] sm:p-5">
                      {typeof row.apps === 'boolean' ? (
                        row.apps ? (
                          <Check className="size-4.5 text-emerald-600" />
                        ) : (
                          <X className="size-4.5 text-gray-300" />
                        )
                      ) : (
                        row.apps
                      )}
                    </td>
                    <td className="p-4 text-[#5a6678] sm:p-5">
                      {typeof row.willpower === 'boolean' ? (
                        row.willpower ? (
                          <Check className="size-4.5 text-emerald-600" />
                        ) : (
                          <X className="size-4.5 text-gray-300" />
                        )
                      ) : (
                        row.willpower
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
