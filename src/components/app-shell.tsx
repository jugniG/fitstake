import { Link, useRouterState, useNavigate } from '@tanstack/react-router'
import { BookOpen, Flame, Video } from 'lucide-react'
import type { ReactNode } from 'react'
import { useSession, signOut } from '#/lib/auth-client'
import { cn } from '#/lib/utils'
import { BrandMark } from '#/components/brand-mark'

const navigationItems = [
  { to: '/dashboard', label: 'Today', icon: Flame },
  { to: '/record', label: 'Record', icon: Video },
  { to: '/history', label: 'Ledger', icon: BookOpen },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (routerState) => routerState.location.pathname })

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#faf8f5] text-[#0d1b2a]">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-[#0d1b2a14] bg-[#faf8f5]/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="group flex min-w-0 items-center gap-3">
            <BrandMark className="size-7 text-[#2b66f2] transition-transform duration-300 group-hover:rotate-[-6deg]" />
            <span className="min-w-0">
              <span className="block truncate font-display text-lg font-bold leading-none tracking-tight text-[#0d1b2a]">
                StakeFit
              </span>
              <span className="mt-1 block truncate text-[0.65rem] font-bold uppercase tracking-wider text-[#5a6678]">
                {session?.user.email ?? 'Signed out'}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={async () => {
              await signOut()
              void navigate({ to: '/' })
            }}
            className="btn-quippy-secondary px-3.5 py-1.5 text-xs font-bold"
          >
            Sign out
          </button>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto w-full max-w-3xl flex-1 px-4 pt-7 pb-32 sm:px-6 sm:pt-10"
      >
        {children}
      </main>

      <BottomNavigation pathname={pathname} />
    </div>
  )
}

function BottomNavigation({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#0d1b2a14] bg-[#faf8f5]/90 backdrop-blur-md shadow-xs"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-1 px-3 py-2">
        {navigationItems.map((item) => {
          const active = pathname.startsWith(item.to)
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[0.68rem] font-bold tracking-wider uppercase transition-all',
                active
                  ? 'bg-[#2b66f2]/10 text-[#2b66f2] shadow-xs'
                  : 'text-[#5a6678] hover:bg-white/60 hover:text-[#0d1b2a]',
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn('size-5', active ? 'text-[#2b66f2]' : 'text-[#5a6678]')}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
