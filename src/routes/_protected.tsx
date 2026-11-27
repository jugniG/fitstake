import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getSession } from '#/lib/auth.functions'
import { getAppAccess } from '#/lib/server/access'
import { AppShell } from '#/components/app-shell'

export const Route = createFileRoute('/_protected')({
  beforeLoad: async ({ location }) => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: '/login' })
    }
    const access = await getAppAccess()
    // Onboarding: /setup opens without a plan so users invest in their challenge before the
    // plan step. The server still refuses to create a challenge without a plan.
    if (!access.hasAccess && location.pathname !== '/setup') {
      throw redirect({ to: '/setup' })
    }
    return { user: session.user, access }
  },
  component: ProtectedLayout,
})

function ProtectedLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
