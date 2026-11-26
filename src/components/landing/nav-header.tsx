import { Link } from '@tanstack/react-router'
import { BrandMark } from '#/components/brand-mark'
import { useSession } from '#/lib/auth-client'

export function NavHeader() {
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-50 border-b border-[#0d1b2a14] bg-[#faf8f5]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <BrandMark className="h-7 w-5 text-[#2b66f2]" />
          <span className="font-sans text-xl font-bold tracking-tight text-[#0d1b2a]">
            Habit-Stakes
          </span>
          <span className="hidden sm:inline-block rounded-full bg-[#eef3fb] px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-[#2b66f2]">
            by Sahil
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-xs font-bold text-[#5a6678] lg:flex">
          <a href="#in-short" className="transition-colors hover:text-[#0d1b2a]">
            In short
          </a>
          <a href="#scenarios" className="transition-colors hover:text-[#0d1b2a]">
            Relatable
          </a>
          <a href="#science" className="transition-colors hover:text-[#0d1b2a]">
            The Science
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-[#0d1b2a]">
            How it works
          </a>
          <a href="#compare" className="transition-colors hover:text-[#0d1b2a]">
            Comparison
          </a>
          <a href="#faq" className="transition-colors hover:text-[#0d1b2a]">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <Link to="/dashboard" className="btn-quippy px-5 py-2 text-xs">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden text-xs font-bold text-[#5a6678] hover:text-[#0d1b2a] sm:inline-block"
              >
                Sign in
              </Link>
              <Link to="/login" className="btn-quippy px-5 py-2 text-xs">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
