import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { getSession } from '#/lib/auth.functions'
import { signOut } from '#/lib/auth-client'
import { getAppAccess, startAccessCheckout } from '#/lib/server/access'
import type { AccessPlan } from '#/lib/server/access'
import { LIFETIME_PRICE_USD, TRIAL_DAYS, WEEKLY_PRICE_USD } from '#/lib/access'
import { BrandMark } from '#/components/brand-mark'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { readSetupDraft } from '#/components/challenge/setup-draft'
import type { SetupDraft } from '#/components/challenge/setup-draft'
import { formatUSD } from '#/lib/format'
import { cn } from '#/lib/utils'

const CONFIRM_POLL_MS = 2000
// Total wait, not attempt count: a slow database call shouldn't stretch the wait to minutes.
const CONFIRM_MAX_MS = 45_000

type ConfirmState = 'idle' | 'confirming' | 'failed' | 'timed_out'

export const Route = createFileRoute('/paywall')({
  validateSearch: (search: Record<string, unknown>) =>
    search.checkout === 'return' ? { checkout: 'return' as const } : {},
  beforeLoad: async ({ search }) => {
    const session = await getSession()
    if (!session) throw redirect({ to: '/login' })
    const access = await getAppAccess()
    // On return from checkout the page itself redirects, because only the browser knows whether
    // an onboarding draft is waiting for its card authorization. A server redirect skipped it.
    const onLifetime = access.plan === 'lifetime' || access.plan === 'lifetime_trial'
    // The paywall_enabled experiment turned the paywall off for this user.
    if (access.reason === 'paywall_off') throw redirect({ to: '/setup' })
    if (onLifetime && search.checkout !== 'return') {
      throw redirect({ to: '/dashboard' })
    }
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
  const [confirmState, setConfirmState] = useState<ConfirmState>(
    checkout === 'return' ? 'confirming' : 'idle',
  )
  const confirming = confirmState === 'confirming'

  const weeklyActive = access.plan === 'weekly'
  const [draft, setDraft] = useState<SetupDraft | null>(null)
  useEffect(() => setDraft(readSetupDraft()), [])
  const draftExerciseCount = draft?.exercises.filter((e) => e.enabled).length ?? 0

  // On return the webhook may not have landed yet, so poll until access changes. A weekly
  // subscriber who upgrades already has access, so wait specifically for lifetime in that case.
  useEffect(() => {
    if (checkout !== 'return') return
    let active = true
    let timer: number | undefined
    const startedAt = Date.now()
    const waitForLifetime = weeklyActive

    async function poll() {
      try {
        const latest = await getAppAccess()
        if (!active) return
        const done = waitForLifetime ? latest.reason === 'lifetime' : latest.hasAccess
        if (done) {
          // Onboarding users still need to authorize their card for the challenge they built.
          void navigate({ to: readSetupDraft() ? '/setup' : '/dashboard', replace: true })
          return
        }
        if (latest.recentCheckoutFailed) {
          setConfirmState('failed')
          return
        }
      } catch (cause) {
        console.error('[paywall] could not confirm payment:', cause)
      }
      if (Date.now() - startedAt >= CONFIRM_MAX_MS) {
        if (active) setConfirmState('timed_out')
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
        <div aria-live="polite">
          {confirmState === 'confirming' ? (
            <div
              role="status"
              className="flex items-center justify-center gap-3 rounded-2xl border-2 border-[#2b66f2] bg-[#2b66f2] px-5 py-4 text-base font-bold text-white shadow-md"
            >
              <Loader2 className="size-5 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
              Confirming your payment with Dodo…
            </div>
          ) : null}
          {confirmState === 'failed' ? (
            <div
              role="alert"
              className="rounded-2xl border-2 border-rose-500 bg-rose-50 px-5 py-4 text-center text-rose-800 shadow-md"
            >
              <p className="text-base font-bold">Your payment didn't go through.</p>
              <p className="mt-1 text-sm">
                Dodo reported the checkout as failed, usually a declined card. Nothing was charged.
                Choose a plan below to try again with another card.
              </p>
            </div>
          ) : null}
          {confirmState === 'timed_out' ? (
            <div
              role="status"
              className="rounded-2xl border-2 border-amber-400 bg-amber-50 px-5 py-4 text-center text-amber-900 shadow-md"
            >
              <p className="text-base font-bold">Still waiting for Dodo to confirm.</p>
              <p className="mt-1 text-sm">
                If you finished checkout, reload this page in a minute. If you didn't, choose a plan
                below.
              </p>
            </div>
          ) : null}
        </div>

        <header className="space-y-1.5 text-center">
          {draft && !weeklyActive ? (
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#2b66f2]">
              Step 2 of 2: Choose your plan
            </p>
          ) : null}
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
            {weeklyActive
              ? 'Upgrade to lifetime'
              : draft
                ? `Your ${draft.totalDays}-day, ${formatUSD(draft.dailyStakeAmount)}/day challenge is ready`
                : 'Choose your plan'}
          </h1>
          {draft && !weeklyActive ? (
            <p className="text-sm font-semibold text-[#0d1b2a]">
              {draftExerciseCount} {draftExerciseCount === 1 ? 'exercise' : 'exercises'} a day,{' '}
              {formatUSD(draft.dailyStakeAmount)} for each missed day. Pick a plan to lock it in.
            </p>
          ) : null}
          <p className="text-sm text-[#5a6678]">
            {access.trialAvailable
              ? `Both plans start with a ${TRIAL_DAYS}-day free trial. A card is required; nothing is charged until the trial ends.`
              : 'Camera-verified workouts with real stakes. A card is required for both plans.'}
          </p>
        </header>

        {access.lifetimeChargeFailed ? (
          <p
            role="alert"
            className="rounded-2xl border border-rose-500/20 bg-rose-50 p-3 text-center text-xs font-semibold text-rose-700"
          >
            Your trial ended and the ${LIFETIME_PRICE_USD} lifetime charge was declined. Choose a
            plan to keep using StakeFit.
          </p>
        ) : null}

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
            badge={access.trialAvailable ? `${TRIAL_DAYS}-day free trial` : 'Lifetime'}
            description={
              weeklyActive
                ? `Pay $${LIFETIME_PRICE_USD} once. Your weekly plan is cancelled automatically.`
                : access.trialAvailable
                  ? `Your card is charged $${LIFETIME_PRICE_USD} once when the ${TRIAL_DAYS}-day trial ends. Cancel before then and pay nothing.`
                  : `Pay $${LIFETIME_PRICE_USD} once and keep StakeFit forever.`
            }
            perks={['Unlimited challenges, forever', 'No renewals']}
            cta={
              access.trialAvailable
                ? `Start ${TRIAL_DAYS}-day free trial`
                : `Get lifetime for $${LIFETIME_PRICE_USD}`
            }
            disabled={confirming || startingPlan !== null}
            loading={startingPlan === 'lifetime'}
            onChoose={() => void onChoose('lifetime')}
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-2xl border border-rose-500/20 bg-rose-50 p-3 text-center text-xs font-semibold text-rose-700"
          >
            {error}
          </p>
        ) : null}

        <div className="flex justify-center gap-5">
          {draft && !access.hasAccess ? (
            <button
              type="button"
              onClick={() => void navigate({ to: '/setup' })}
              className="text-xs font-bold text-[#2b66f2] underline-offset-2 hover:underline"
            >
              Edit my challenge
            </button>
          ) : null}
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
