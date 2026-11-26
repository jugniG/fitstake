import { createFileRoute } from '@tanstack/react-router'
import { SetupForm } from '#/components/challenge/setup-form'

export const Route = createFileRoute('/_protected/setup')({
  component: SetupPage,
})

function SetupPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#2b66f2]">
          New Challenge
        </p>
        <h1 className="font-display text-3xl font-extrabold text-[#0d1b2a] sm:text-4xl">
          Lock in your workout commitment.
        </h1>
        <p className="text-sm leading-relaxed text-[#5a6678]">
          Choose your duration, daily stake amount, and daily exercises (push-ups, squats, jumping
          jacks). Deposit your pot into secure escrow, then win back 100% of your money day by day
          on camera.
        </p>
      </header>
      <SetupForm />
    </div>
  )
}
