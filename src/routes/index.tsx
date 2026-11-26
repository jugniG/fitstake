import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useSession } from '#/lib/auth-client'
import { BrandMark } from '#/components/brand-mark'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isPending && session) void navigate({ to: '/dashboard', replace: true })
  }, [isPending, session, navigate])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <BrandMark className="h-16 w-11 text-rust" />
      <p className="eyebrow mt-6">Habit-Stakes</p>
      <h1 className="mt-2 font-display text-4xl font-medium text-bone">
        Lock your word with real stakes.
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        Choose your workout, your daily stake and how many days. Pay the full pot upfront. Complete
        a day on camera and that day's stake moves into your won-back balance. Miss it and it's
        forfeited. One refund of everything you won back settles the challenge.
      </p>
      <div className="mt-8">
        <Link to="/login">
          <Button variant="primary" size="lg">
            Sign in to begin
          </Button>
        </Link>
      </div>
    </div>
  )
}
