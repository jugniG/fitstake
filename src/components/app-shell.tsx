import { Link, useRouterState } from '@tanstack/react-router'
import { BookOpen, Flame, Video } from 'lucide-react'
import type { ReactNode } from 'react'
import { useCommitment } from '#/lib/commitment-store'
import { cn } from '#/lib/utils'
import { BrandMark } from '#/components/brand-mark'

const navigationItems = [
  { to: '/dashboard', label: 'Ritual', icon: Flame },
  { to: '/record', label: 'Mirror', icon: Video },
  { to: '/history', label: 'Ledger', icon: BookOpen },
] as const

export function AppShell({
  children,
  hideNavigation = false,
}: {
  children: ReactNode
  hideNavigation?: boolean
}) {
  const { state, storageWarning } = useCommitment()
  const pathname = useRouterState({ select: (routerState) => routerState.location.pathname })
  const homeTarget = state.plan ? '/dashboard' : '/setup'

  return (
    <div className="relative flex min-h-dvh flex-col">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-void/[0.88] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to={homeTarget} className="group flex min-w-0 items-center gap-3">
            <BrandMark className="h-9 w-7 text-rust transition-colors group-hover:text-bone" />
            <span className="min-w-0">
              <span className="block truncate font-display text-[1.15rem] font-medium leading-none tracking-[0.01em] text-bone">
                Workout Commitment
              </span>
              <span className="mt-1 block text-[0.58rem] uppercase tracking-[0.24em] text-muted">
                Private ritual · prototype
              </span>
            </span>
          </Link>
          <span className="shrink-0 border border-rust/40 bg-rust/[0.08] px-2 py-1 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-rust">
            Demo
          </span>
        </div>
        <p className="border-t border-rust/15 bg-rust/[0.045] px-4 py-1.5 text-center text-[0.6rem] uppercase tracking-[0.2em] text-rust/90">
          Demo: no real money moves
        </p>
      </header>

      {storageWarning ? (
        <div className="mx-auto mt-4 w-full max-w-2xl px-4 sm:px-6">
          <p
            role="status"
            className="border border-rust/35 bg-rust/[0.08] px-3 py-2 text-xs leading-relaxed text-bone-dim"
          >
            {storageWarning}
          </p>
        </div>
      ) : null}

      <main
        id="main-content"
        className={cn(
          'mx-auto w-full max-w-2xl flex-1 px-4 pt-7 sm:px-6 sm:pt-10',
          hideNavigation ? 'pb-12' : 'pb-32',
        )}
      >
        {children}
      </main>

      {hideNavigation ? null : <BottomNavigation pathname={pathname} />}
    </div>
  )
}

function BottomNavigation({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-void/[0.92] backdrop-blur-md"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto grid w-full max-w-2xl grid-cols-3 px-2">
        {navigationItems.map((item) => {
          const active = pathname === item.to
          const Icon = item.icon

          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex min-h-16 flex-col items-center justify-center gap-1.5 px-2 pt-2 text-[0.62rem] font-medium uppercase tracking-[0.18em] transition-colors',
                active ? 'text-bone' : 'text-muted hover:text-bone-dim',
              )}
            >
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute top-0 h-px w-9 bg-rust shadow-[0_0_10px_rgba(210,105,78,0.65)]"
                />
              ) : null}
              <Icon
                aria-hidden="true"
                className={cn('h-[1.15rem] w-[1.15rem]', active ? 'text-rust' : 'text-faint')}
                strokeWidth={1.5}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
