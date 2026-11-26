import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'

const FAQS = [
  {
    q: 'Is my camera video recorded, uploaded, or saved anywhere?',
    a: 'Absolutely not. All computer vision and contactless biometric sensing runs 100% locally on your machine via WebAssembly. Video frames live in your browser’s volatile RAM for only milliseconds to calculate joint angles and optical vitals, and are immediately discarded. No video is ever stored, saved to disk, or sent to any server.',
  },
  {
    q: 'How does the money and refund mechanism work?',
    a: 'You pay your total challenge stake upfront via Kelviq secure escrow checkout. Every day you complete your workout on camera before your local midnight cutoff, that day’s stake is transferred into your "Won-Back" vault. When the challenge ends, a single automated settlement refund returns 100% of your won-back balance directly to your original payment method.',
  },
  {
    q: 'What happens if I miss a day or fail to finish my sets?',
    a: 'The protocol is uncompromising: if you do not complete your required sets before your local midnight deadline, that day’s allocation is forfeited. There are no doctor notes, pause buttons, or rollovers. The remaining days of your challenge continue normally.',
  },
  {
    q: 'Do I need an Apple Watch, Whoop band, or heart monitor?',
    a: 'No external sensors are needed. Habit-Stakes integrates Presage SmartSpectra™ contactless sensing, which measures your pulse rate, breathing, and HRV directly through subtle micro-luminance variations in your webcam video feed (rPPG).',
  },
  {
    q: 'Can I trick the camera by playing a video or moving my hands?',
    a: 'No. The system uses strict 3D joint angle kinematics (such as parallel knee angles <= 110° and vertical hip descent for squats) combined with SmartSpectra cardiovascular exertion tracking. Leaning forward over a desk or playing a static looped video will fail the biological liveness and exertion threshold tests.',
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="scroll-mt-20 py-20 sm:py-28 border-t border-line/40">
      <div className="mx-auto max-w-4xl px-6">
        <div className="text-center">
          <p className="eyebrow">Clarity & Rules</p>
          <h2 className="mt-2 font-display text-3xl font-medium text-bone sm:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted">
            The rules of engagement are simple, transparent, and immutable.
          </p>
        </div>

        <div className="mt-12 space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-xl border border-line/60 bg-panel/40 backdrop-blur-xs transition-colors hover:border-line"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-5 text-left text-sm font-medium text-bone sm:text-base cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="h-4 w-4 shrink-0 text-rust" />
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-rust' : ''
                    }`}
                  />
                </button>

                {isOpen ? (
                  <div className="border-t border-line/40 px-5 pt-3 pb-5 text-xs sm:text-sm leading-relaxed text-muted">
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
