import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useSession } from '#/lib/auth-client'
import { NavHeader } from '#/components/landing/nav-header'
import { Hero } from '#/components/landing/hero'
import { ProtocolSteps } from '#/components/landing/protocol-steps'
import { StakesCalculator } from '#/components/landing/calculator'
import { VitalsShowcase } from '#/components/landing/vitals-showcase'
import { FAQ } from '#/components/landing/faq'
import { Footer } from '#/components/landing/footer'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-dvh flex flex-col bg-void text-bone selection:bg-rust-deep selection:text-bone">
      {/* Active Session Notification Bar */}
      {session ? (
        <div className="border-b border-rust/40 bg-rust/10 px-4 py-2 text-center text-xs text-bone">
          <span>
            You are signed in as{' '}
            <span className="font-mono font-semibold text-rust">
              {session.user.name || session.user.email}
            </span>
            .
          </span>{' '}
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 font-semibold text-rust underline underline-offset-4 hover:text-bone ml-1"
          >
            Go to your Dashboard <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : null}

      <NavHeader />

      <main className="flex-1">
        <Hero />
        <ProtocolSteps />
        <StakesCalculator />
        <VitalsShowcase />
        <FAQ />
      </main>

      <Footer />
    </div>
  )
}
