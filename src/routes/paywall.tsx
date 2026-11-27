import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { getSession } from '#/lib/auth.functions'
import { signOut } from '#/lib/auth-client'
import { getAppAccess, startAccessCheckout } from '#/lib/server/access'
import type { AccessPlan } from '#/lib/server/access'
import { LIFETIME_PRICE_USD, TRIAL_DAYS, WEEKLY_PRICE_USD } from '#/lib/access'
import { BrandMark } from '#/components/brand-mark'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { cn } from '#/lib/utils'

const CONFIRM_POLL_MS = 2000
const CONFIRM_MAX_ATTEMPTS = 15

export const Route = createFileRoute('/paywall')({
  validateSearch: (search: Record<string, unknown>) =>
    search.checkout === 'return' ? { checkout: 'return' as const } : {},
  beforeLoad: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/login' })
    const access = await getAppAccess()
    if (access.reason === 'lifetime') throw redirect({ to: '/dashboard' })
    return { access }
  },
  loader: ({ context }) => context.access,
  component: PaywallPage,
})

function PaywallPage() {
  const { checkout } = Route.useSearch()
  const access = Route.useLoaderData()
  const navigate = useNavigate()
  const [startingPlan, setStartingPlan] = useState<AccessPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(checkout === 'return')

  const weeklyActive = access.reason === 'trial' || access.reason === 'subscribed'

  // On return the webhook may not have landed yet, so poll until access changes. A weekly
  // subscriber who upgrades already has access, so wait specifically for lifetime in that case.
  useEffect(() => {
    if (checkout !== 'return') return
    let active = true
    let attempts = 0
    let timer: number | undefined
    const waitForLifetime = weeklyActive

    async function poll() {
      try {
        const latest = await getAppAccess()
        if (!active) return
        const done = waitForLifetime ? latest.reason === 'lifetime' : latest.hasAccess
        if (done) {
          void navigate({ to: '/dashboard', replace: true })
          return
        }
      } catch (cause) {
        console.error('[paywall] could not confirm payment:', cause)
      }
      attempts += 1
      if (attempts >= CONFIRM_MAX_ATTEMPTS) {
        if (active) setConfirming(false)
        return
      }
      timer = window.setTimeout(poll, CONFIRM_POLL_MS)
    }

    void poll()
    return () => {
      active = false
      if (timer) window.clearTimeout(timer)
    }
  }, [checkout, navigate, weeklyActive])

  async function onChoose(plan: AccessPlan) {
    setError(null)
    setStartingPlan(plan)
    try {
      const { checkoutUrl } = await startAccessCheckout({ data: { plan } })
      window.location.assign(checkoutUrl)
    } catch (cause) {
      console.error(`[paywall] ${plan} checkout failed:`, cause)
      setError((cause as Error).message)
      setStartingPlan(null)
    }
  }

  const weeklyCta = access.trialAvailable
    ? `Start ${TRIAL_DAYS}-day free trial`
    : `Subscribe for $${WEEKLY_PRICE_USD}/week`

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#faf8f5] px-5 py-12 text-[#0d1b2a]">
      <div className="mb-8 flex items-center gap-2.5">
        <BrandMark className="size-8 text-[#2b66f2]" />
        <span className="font-sans text-2xl font-bold tracking-tight">StakeFit</span>
      </div>

      <div className="w-full max-w-2xl space-y-5">
        <header className="space-y-1.5 text-center">
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
            {weeklyActive ? 'Upgrade to lifetime' : 'Choose your plan'}
          </h1>
          <p className="text-sm text-[#5a6678]">
            Camera-verified workouts and daily stakes you win back. A card is required for both
            plans.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <PlanCard
            title={`$${WEEKLY_PRICE_USD}/week`}
            badge={access.trialAvailable ? `${TRIAL_DAYS}-day free trial` : 'Weekly'}
            description={
              access.trialAvailable
                ? `Your card is charged $${WEEKLY_PRICE_USD} when the ${TRIAL_DAYS}-day trial ends, then every week. Cancel before then and pay nothing.`
                : `Billed $${WEEKLY_PRICE_USD} every week. Cancel any time.`
            }
            perks={['Unlimited challenges', 'Cancel any time']}
            cta={weeklyActive ? 'Your current plan' : weeklyCta}
            disabled={weeklyActive || confirming || startingPlan !== null}
            loading={startingPlan === 'weekly'}
            onChoose={() => void onChoose('weekly')}
          />
          <PlanCard
            highlighted
            title={`$${LIFETIME_PRICE_USD} once`}
            badge="Lifetime"
            description={
              weeklyActive
                ? `Pay $${LIFETIME_PRICE_USD} once. Your weekly plan is cancelled automatically.`
                : `Pay $${LIFETIME_PRICE_USD} once and keep StakeFit forever. No trial.`
            }
            perks={['Unlimited challenges, forever', 'No renewals']}
            cta={`Get lifetime for $${LIFETIME_PRICE_USD}`}
            disabled={confirming || startingPlan !== null}
            loading={startingPlan === 'lifetime'}
            onChoose={() => void onChoose('lifetime')}
          />
        </div>

        <p className="text-center text-xs text-[#5a6678]">Tax may be added at checkout.</p>

        {confirming ? (
          <p
            role="status"
            className="rounded-2xl border border-[#2b66f2]/20 bg-[#2b66f2]/10 p-3 text-center text-xs font-semibold text-[#2b66f2]"
          >
            Confirming your payment…
          </p>
        ) : null}
        {checkout === 'return' && !confirming ? (
          <p role="status" className="text-center text-xs font-semibold text-[#5a6678]">
            We have not received your payment confirmation yet. Reload in a minute, or choose a plan
            again if you did not finish checkout.
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-2xl border border-rose-500/20 bg-rose-50 p-3 text-center text-xs font-semibold text-rose-700"
          >
            {error}
          </p>
        ) : null}

        <div className="flex justify-center gap-5">
          {access.hasAccess ? (
            <button
              type="button"
              onClick={() => void navigate({ to: '/dashboard' })}
              className="text-xs font-bold text-[#2b66f2] underline-offset-2 hover:underline"
            >
              Back to the app
            </button>
          ) : null}
          <button
            type="button"
            onClick={async () => {
              await signOut()
              void navigate({ to: '/' })
            }}
            className="text-xs font-bold text-[#5a6678] underline-offset-2 hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

function PlanCard(props: {
  title: string
  badge: string
  description: string
  perks: string[]
  cta: string
  disabled: boolean
  loading: boolean
  highlighted?: boolean
  onChoose: () => void
}) {
  return (
    <Card className={cn('flex flex-col shadow-md', props.highlighted && 'ring-2 ring-[#2b66f2]')}>
      <CardHeader className="pb-3">
        <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#2b66f2]">
          {props.badge}
        </p>
        <CardTitle className="text-2xl font-extrabold">{props.title}</CardTitle>
        <CardDescription>{props.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4 pt-0">
        <ul className="space-y-2 text-sm">
          {props.perks.map((perk) => (
            <li key={perk} className="flex items-start gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-[#2b66f2]" aria-hidden="true" />
              <span>{perk}</span>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant={props.highlighted ? 'primary' : 'outline'}
          size="lg"
          className="w-full"
          disabled={props.disabled}
          onClick={props.onChoose}
        >
          {props.loading ? 'Opening checkout…' : props.cta}
        </Button>
      </CardContent>
    </Card>
  )
}
