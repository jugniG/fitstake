import { Link } from '@tanstack/react-router'
import { BrandMark } from '#/components/brand-mark'
import { Button } from '#/components/ui/button'
import { useSession } from '#/lib/auth-client'

export function NavHeader() {
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-void/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
          <BrandMark className="h-7 w-5 text-rust" />
          <span className="font-display text-xl font-medium tracking-wide text-bone">
            Habit-Stakes
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-xs font-mono tracking-wider uppercase text-muted md:flex">
          <a href="#how-it-works" className="transition-colors hover:text-bone">
            The Protocol
          </a>
          <a href="#calculator" className="transition-colors hover:text-bone">
            Calculator
          </a>
          <a href="#biometrics" className="transition-colors hover:text-bone">
            Biometrics
          </a>
          <a href="#faq" className="transition-colors hover:text-bone">
            Rules & FAQ
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <Link to="/dashboard">
              <Button variant="primary" size="sm">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Sign in
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="primary" size="sm">
                  Start Commitment
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
