import { Link, useRouterState, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useSession, signOut } from '#/lib/auth-client'
import { cn } from '#/lib/utils'
import { BrandMark } from '#/components/brand-mark'

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
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/history"
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                pathname === '/history'
                  ? 'bg-[#2b66f2]/10 text-[#2b66f2]'
                  : 'text-[#5a6678] hover:bg-white hover:text-[#0d1b2a]',
              )}
            >
              Ledger
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
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto w-full max-w-3xl flex-1 px-4 pt-7 pb-12 sm:px-6 sm:pt-10"
      >
        {children}
      </main>
    </div>
  )
}
