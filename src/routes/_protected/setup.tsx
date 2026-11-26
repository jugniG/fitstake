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
          Pick your movement, your daily stake ($5–$50), and duration. Deposit your pot upfront via
          audited escrow, then win back 100% of every dollar day by day on camera.
        </p>
      </header>
      <SetupForm />
    </div>
  )
}
