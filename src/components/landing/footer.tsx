import { Link } from '@tanstack/react-router'
import { BrandMark } from '#/components/brand-mark'
import { Button } from '#/components/ui/button'
import { ArrowRight } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-line/60 bg-void/90 py-16">
      {/* Final Call to Action */}
      <div className="mx-auto max-w-4xl px-6 text-center pb-16">
        <h2 className="font-display text-3xl font-medium text-bone sm:text-5xl">
          No excuses. No fake motivation.
          <span className="block italic text-rust">Just your word on the line.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm text-muted">
          Your daily commitment is waiting. Deposit your stake, step in front of the camera, and
          earn back every single dollar with your own sweat.
        </p>
        <div className="mt-8 flex justify-center">
          <Link to="/login">
            <Button variant="primary" size="lg" className="gap-2 text-base">
              Start Your Commitment <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl border-t border-line/40 px-6 pt-10 flex flex-col items-center justify-between gap-6 sm:flex-row text-xs text-muted">
        <div className="flex items-center gap-3">
          <BrandMark className="h-6 w-4 text-rust" />
          <span className="font-display text-base font-medium text-bone">Habit-Stakes</span>
          <span className="font-mono text-[0.7rem] text-faint">© {new Date().getFullYear()}</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 font-mono text-[0.7rem]">
          <span className="text-faint">Privacy: 100% On-Device Processing</span>
          <span className="text-faint">·</span>
          <span className="text-faint">Presage SmartSpectra™ Vitals</span>
          <span className="text-faint">·</span>
          <span className="text-faint">Kelviq Merchant Escrow</span>
        </div>
      </div>
    </footer>
  )
}
