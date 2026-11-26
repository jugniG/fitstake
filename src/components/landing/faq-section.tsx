import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'

const FAQS = [
  {
    q: 'How does Habit-Stakes work?',
    a: 'Pick your daily exercise (e.g. Deep Squats 3×15), set your daily stake (e.g. $10/day), and deposit the pot upfront. Complete your daily reps in front of your camera before your local midnight cutoff. Each finished day locks that day’s stake into your Won-Back vault. At the end of your challenge, 100% of your won-back balance is refunded to your card.',
  },
  {
    q: 'Do I have to put money on the line?',
    a: 'Yes. The entire philosophy is built on behavioral loss aversion. Without stakes, skipping a workout costs zero dollars in the moment. When your own hard-earned money is on the line, the psychological friction of procrastination disappears.',
  },
  {
    q: 'Is my camera video recorded, uploaded, or saved?',
    a: 'Never. All vision processing (MediaPipe joint tracking and Presage SmartSpectra™ contactless vitals) runs 100% locally on your machine via WebAssembly. Frames exist in browser memory for milliseconds to verify angles and are immediately wiped. No video is ever saved to disk or transmitted over the internet.',
  },
  {
    q: 'What happens if I miss a day?',
    a: 'If you fail to finish your required sets before your local midnight cutoff, that day’s daily allocation is permanently forfeited. There are no doctor excuses, rollovers, or pause buttons. The remaining days of your challenge continue normally.',
  },
  {
    q: 'How does the refund reach my bank account?',
    a: 'We use Kelviq merchant escrow infrastructure. When your commitment concludes, the total won-back amount is batched and refunded automatically back to the original credit/debit card you used at checkout.',
  },
  {
    q: 'Do I need any special hardware or wearables?',
    a: 'No smartwatches, chest straps, or sensors are needed. Any standard laptop webcam or smartphone camera is all you need. Presage SmartSpectra™ extracts physiological vitals directly from facial micro-luminance in the video stream.',
  },
]

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <section id="faq" className="border-t border-[#0d1b2a14] bg-[#faf8f5] py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-5">
        <div className="text-center">
          <p className="inline-block rounded-full bg-[#eef3fb] px-3.5 py-1 text-xs font-bold tracking-wider text-[#5a6678] uppercase">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0d1b2a] sm:text-5xl">
            The <span className="serif text-[#2b66f2]">obvious</span> questions.
          </h2>
        </div>

        <div className="mt-12 space-y-3.5">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-2xl border border-[#0d1b2a14] bg-white transition-all shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-5 text-left font-bold text-[#0d1b2a] sm:p-6 sm:text-lg cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <div className="ml-4 grid size-7 shrink-0 place-items-center rounded-full bg-[#eef3fb] text-[#2b66f2]">
                    {isOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
                  </div>
                </button>

                {isOpen ? (
                  <div className="border-t border-[#0d1b2a10] px-5 pt-3 pb-6 text-sm leading-relaxed text-[#5a6678] sm:px-6">
                    {faq.a}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
