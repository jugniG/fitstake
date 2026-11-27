import { createFileRoute } from '@tanstack/react-router'
import { NavHeader } from '#/components/landing/nav-header'
import { Hero, HeroSky } from '#/components/landing/hero'
import { FounderStory } from '#/components/landing/founder-story'
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
  return (
    <div className="landing min-h-dvh flex flex-col bg-[#faf8f5] text-[#0d1b2a] selection:bg-[#2b66f2]/20 selection:text-[#2b66f2] font-sans">
      <NavHeader />

      <main className="flex-1">
        <HeroSky>
          <Hero />
          <FounderStory />
        </HeroSky>
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
