import { createFileRoute } from '@tanstack/react-router'
import { SetupForm } from '#/components/challenge/setup-form'

export const Route = createFileRoute('/_protected/setup')({
  component: SetupPage,
})

function SetupPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="eyebrow">New challenge</p>
        <h1 className="font-display text-3xl font-medium text-bone">Forge your commitment.</h1>
        <p className="text-sm leading-relaxed text-muted">
          Pick the movement, the daily stake (USD), and how many days. You'll pay the full pot
          upfront via Kelviq, then win each day back by completing your reps on camera.
        </p>
      </header>
      <SetupForm />
    </div>
  )
}
