import { Flagsmith } from '@flagsmith/nodejs'
import type { FlagsmithValue, TraitConfig } from '@flagsmith/nodejs'
import { env } from './env'
import { FLAG, FALLBACK, readDefaultStake, readPaywallEnabled, TRAIT } from './experiments'

// Server-only Flagsmith client. Every call here falls back to today's behaviour (paywall on,
// $10 stake) if Flagsmith is unset, slow or down, so an outage can never break onboarding.

const REQUEST_TIMEOUT_MS = 2500
const FLUSH_TIMEOUT_MS = 2000
// Access checks run on every protected page load; don't ask Flagsmith each time.
const PAYWALL_CACHE_MS = 30_000

type Traits = Record<string, FlagsmithValue | TraitConfig>

let client: Flagsmith | null | undefined

function getClient(): Flagsmith | null {
  if (client !== undefined) return client
  if (!env.FLAGSMITH_ENVIRONMENT_KEY) {
    console.warn('[flagsmith] FLAGSMITH_ENVIRONMENT_KEY is not set; using fallback flag values')
    client = null
    return client
  }
  client = new Flagsmith({
    environmentKey: env.FLAGSMITH_ENVIRONMENT_KEY,
    requestTimeoutSeconds: REQUEST_TIMEOUT_MS / 1000,
    retries: 1,
    enableEvents: true,
  })
  return client
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    )
  })
}

// Serverless functions can freeze right after responding, so buffered events are sent before
// the request finishes instead of waiting for the SDK's 10-second timer.
async function flush(): Promise<void> {
  const flagsmith = getClient()
  if (!flagsmith) return
  try {
    await withTimeout(flagsmith.flushEvents(), FLUSH_TIMEOUT_MS)
  } catch (error) {
    console.error('[flagsmith] could not send events:', (error as Error).message)
  }
}

function lateNightTraits(isLateNight: boolean): Traits {
  // Transient: used for this evaluation (the late-night segment) without being stored.
  return { [TRAIT.lateNight]: { value: isLateNight, transient: true } }
}

const paywallCache = new Map<string, { enabled: boolean; expiresAt: number }>()

// Whether this user sees the paywall. Evaluates without recording an exposure; the exposure is
// recorded where the user experiences the difference (recordSetupExposures).
export async function isPaywallEnabled(userId: string): Promise<boolean> {
  const cached = paywallCache.get(userId)
  if (cached && cached.expiresAt > Date.now()) return cached.enabled

  const flagsmith = getClient()
  let enabled: boolean = FALLBACK.paywallEnabled
  if (flagsmith) {
    try {
      const flags = await withTimeout(flagsmith.getIdentityFlags(userId), REQUEST_TIMEOUT_MS)
      enabled = readPaywallEnabled(flags.getFlag(FLAG.paywall))
    } catch (error) {
      console.error(
        '[flagsmith] paywall flag unavailable, keeping the paywall:',
        (error as Error).message,
      )
    }
  }
  paywallCache.set(userId, { enabled, expiresAt: Date.now() + PAYWALL_CACHE_MS })
  return enabled
}

export type SetupConfig = { defaultStake: number; paywallEnabled: boolean }

// Called when the setup screens load. Both experiments diverge there (the pre-selected stake,
// and whether the last step leads to the paywall), so this is where exposures are recorded.
export async function recordSetupExposures(
  userId: string,
  isLateNight: boolean,
): Promise<SetupConfig> {
  const flagsmith = getClient()
  if (!flagsmith) return { ...FALLBACK }

  const traits = lateNightTraits(isLateNight)
  const [stakeResult, paywallResult] = await Promise.allSettled([
    withTimeout(flagsmith.getExperimentFlag(FLAG.defaultStake, userId, traits), REQUEST_TIMEOUT_MS),
    withTimeout(flagsmith.getExperimentFlag(FLAG.paywall, userId, traits), REQUEST_TIMEOUT_MS),
  ])

  if (stakeResult.status === 'rejected') {
    console.error('[flagsmith] default_stake unavailable, using $10:', stakeResult.reason)
  }
  if (paywallResult.status === 'rejected') {
    console.error(
      '[flagsmith] paywall_enabled unavailable, keeping the paywall:',
      paywallResult.reason,
    )
  }

  const config: SetupConfig = {
    defaultStake: readDefaultStake(stakeResult.status === 'fulfilled' ? stakeResult.value : null),
    paywallEnabled: readPaywallEnabled(
      paywallResult.status === 'fulfilled' ? paywallResult.value : null,
    ),
  }
  paywallCache.set(userId, {
    enabled: config.paywallEnabled,
    expiresAt: Date.now() + PAYWALL_CACHE_MS,
  })
  await flush()
  return config
}

// Records a conversion event for an experiment metric. Never throws: analytics must not fail a
// user action.
export async function trackExperimentEvent(userId: string, event: string): Promise<void> {
  const flagsmith = getClient()
  if (!flagsmith) return
  try {
    flagsmith.trackEvent(event, { identifier: userId })
  } catch (error) {
    console.error(`[flagsmith] could not track ${event}:`, (error as Error).message)
    return
  }
  await flush()
}
