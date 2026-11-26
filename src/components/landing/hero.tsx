import { Link } from '@tanstack/react-router'
import { ArrowRight, ShieldCheck, HeartPulse, EyeOff } from 'lucide-react'
import { Button } from '#/components/ui/button'

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
      {/* Ambient background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rust/10 blur-[120px]"
      />

      <div className="mx-auto max-w-4xl px-6 text-center">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-rust/30 bg-rust/10 px-3.5 py-1 text-xs font-mono text-rust">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rust opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rust" />
          </span>
          <span>Presage SmartSpectra™ Verified · Zero Video Stored</span>
        </div>

        {/* Main headline */}
        <h1 className="mt-8 font-display text-4xl font-medium tracking-tight text-bone sm:text-6xl md:text-7xl leading-[1.08]">
          Lock your word with real money.
          <span className="block italic text-rust">Your body is the only receipt.</span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          The ruthless accountability protocol. Back your daily workout with upfront cash in escrow.
          Complete your reps on camera—verified locally with contactless vitals and pose vision. Win
          your own money back day by day, or forfeit it forever.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to="/login" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full sm:w-auto gap-2 text-base">
              Enter the Arena <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="#calculator" className="w-full sm:w-auto">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
              Simulate Your Stakes
            </Button>
          </a>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-16 grid grid-cols-1 gap-4 border-t border-line/50 pt-10 sm:grid-cols-3 sm:gap-6 text-left">
          <div className="rounded-lg border border-line/40 bg-panel/40 p-4 backdrop-blur-xs">
            <div className="flex items-center gap-2.5 text-rust">
              <EyeOff className="h-5 w-5" />
              <span className="font-mono text-xs uppercase tracking-wider font-semibold">
                100% Client-Side
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Camera frames exist in browser memory for milliseconds and vanish immediately. No
              video is ever recorded, stored, or sent to a server.
            </p>
          </div>

          <div className="rounded-lg border border-line/40 bg-panel/40 p-4 backdrop-blur-xs">
            <div className="flex items-center gap-2.5 text-rust">
              <HeartPulse className="h-5 w-5" />
              <span className="font-mono text-xs uppercase tracking-wider font-semibold">
                SmartSpectra™ Vitals
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Contactless optical sensing tracks heart rate surge and post-set recovery drop from
              facial micro-luminance. Screen loops and spoofing fail.
            </p>
          </div>

          <div className="rounded-lg border border-line/40 bg-panel/40 p-4 backdrop-blur-xs">
            <div className="flex items-center gap-2.5 text-rust">
              <ShieldCheck className="h-5 w-5" />
              <span className="font-mono text-xs uppercase tracking-wider font-semibold">
                Kelviq Escrow
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Your funds sit in audited merchant escrow. Every completed day locks your money safely
              into the won-back vault until the final settlement refund.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
