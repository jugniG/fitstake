import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useSession } from '#/lib/auth-client'
import { NavHeader } from '#/components/landing/nav-header'
import { Hero } from '#/components/landing/hero'
import { HonestQuestions } from '#/components/landing/honest-questions'
import { RelatableMoments } from '#/components/landing/relatable-moments'
import { ScienceSection } from '#/components/landing/science-section'
import { LifeReclaimed } from '#/components/landing/life-reclaimed'
import { ProtocolProgression } from '#/components/landing/protocol-progression'
import { MethodSteps } from '#/components/landing/method-steps'
import { ComparisonMatrix } from '#/components/landing/comparison-matrix'
import { FaqSection } from '#/components/landing/faq-section'
import { FinalCta } from '#/components/landing/final-cta'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-dvh flex flex-col bg-[#faf8f5] text-[#0d1b2a] selection:bg-[#2b66f2]/20 selection:text-[#2b66f2] font-sans">
      {/* Active Session Notification Bar */}
      {session ? (
        <div className="border-b border-[#2b66f2]/20 bg-[#eef3fb] px-4 py-2 text-center text-xs text-[#0d1b2a]">
          <span>
            You are signed in as{' '}
            <span className="font-mono font-bold text-[#2b66f2]">
              {session.user.name || session.user.email}
            </span>
            .
          </span>{' '}
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 font-bold text-[#2b66f2] underline underline-offset-4 hover:text-[#1f4fc0] ml-1"
          >
            Go to your Dashboard <ArrowRight className="size-3" />
          </Link>
        </div>
      ) : null}

      <NavHeader />

      <main className="flex-1">
        <Hero />
        <HonestQuestions />
        <RelatableMoments />
        <ScienceSection />
        <LifeReclaimed />
        <ProtocolProgression />
        <MethodSteps />
        <ComparisonMatrix />
        <FaqSection />
      </main>

      <FinalCta />
    </div>
  )
}
