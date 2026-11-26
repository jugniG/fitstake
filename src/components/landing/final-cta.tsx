import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { BrandMark } from '#/components/brand-mark'
import { ContactEmail } from '#/components/contact-email'

export function FinalCta() {
  return (
    <footer className="border-t border-[#0d1b2a14] bg-[#faf8f5] pt-20 pb-12">
      <div className="mx-auto max-w-4xl px-5 text-center">
        <h2 className="text-4xl font-extrabold tracking-tight text-[#0d1b2a] sm:text-6xl lg:text-7xl leading-[1.08]">
          Willpower is a bad plan.
          <br />
          <span className="serif text-[#2b66f2]">Money is a better one.</span>
        </h2>

        <p className="mx-auto mt-6 max-w-lg text-base text-[#5a6678] sm:text-lg">
          Lock in your workout commitment today. Move on camera, verify your reps daily, and reclaim
          100% of your cash.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            to="/login"
            className="btn-quippy inline-flex items-center gap-2 px-8 py-4 text-base font-bold sm:text-lg shadow-md"
          >
            Get Started Now <ArrowRight className="size-5" />
          </Link>
        </div>

        <p className="mt-4 text-xs font-medium text-[#5a6678]">
          Start your commitment · 100% on-device privacy · Secure Money-Back Escrow
        </p>

        {/* Talk with me */}
        <div className="mt-8 flex justify-center">
          <ContactEmail prefix="Talk with me:" />
        </div>

        {/* Bottom divider and links */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-[#0d1b2a14] pt-8 sm:flex-row text-xs text-[#5a6678]">
          <div className="flex items-center gap-2">
            <BrandMark className="size-5 text-[#2b66f2]" />
            <span className="font-bold text-[#0d1b2a]">StakeFit</span>
            <span>© {new Date().getFullYear()} StakeFit. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[0.75rem] font-medium">
            <span>Real-Time Effort Sensing</span>
            <span>·</span>
            <span>On-Device Form Tracking</span>
            <span>·</span>
            <span>100% Client-Side Privacy</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
