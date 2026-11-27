import { createFileRoute } from '@tanstack/react-router'
import { canStartChallenge } from '#/lib/access'
import { SetupForm } from '#/components/challenge/setup-form'

export const Route = createFileRoute('/_protected/setup')({
  component: SetupPage,
})

function SetupPage() {
  const { access } = Route.useRouteContext()
  const hasPlan = canStartChallenge(access.reason)

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="font-mono text-xs font-bold uppercase tracking-wider text-[#2b66f2]">
        {hasPlan ? 'New challenge' : 'Build your first challenge'}
      </h1>
      <SetupForm hasPlan={hasPlan} />
    </div>
  )
}
