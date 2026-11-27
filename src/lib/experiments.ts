// Pure experiment definitions and value parsing, shared by the server and the traffic script.

export const FLAG = {
  paywall: 'paywall_enabled',
  defaultStake: 'default_stake',
} as const

export const EXPERIMENT_EVENT = {
  setupCompleted: 'setup_completed',
  challengeCreated: 'challenge_created',
  firstWorkoutDone: 'first_workout_done',
} as const

export const TRAIT = {
  lateNight: 'is_late_night',
} as const

// Today's behaviour. Used whenever Flagsmith is unset, unreachable or returns something invalid.
export const FALLBACK = {
  paywallEnabled: true,
  defaultStake: 10,
} as const

export const MIN_STAKE = 1
export const MAX_STAKE = 10_000

type FlagLike = { enabled: boolean; value: unknown } | null | undefined

// The paywall is skipped only when the flag is on and explicitly says "off". Anything else,
// including a disabled flag or an unexpected value, keeps the paywall.
export function readPaywallEnabled(flag: FlagLike): boolean {
  if (!flag || !flag.enabled) return FALLBACK.paywallEnabled
  return String(flag.value).trim().toLowerCase() !== 'off'
}

export function readDefaultStake(flag: FlagLike): number {
  if (!flag || !flag.enabled) return FALLBACK.defaultStake
  const stake = Number(flag.value)
  if (!Number.isInteger(stake) || stake < MIN_STAKE || stake > MAX_STAKE) {
    return FALLBACK.defaultStake
  }
  return stake
}
