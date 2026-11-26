import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getSession } from '#/lib/auth.functions'
import { AppShell } from '#/components/app-shell'

export const Route = createFileRoute('/_protected')({
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) {
      throw redirect({ to: '/login' })
    }
    return { user: session.user }
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
