// Simulated traffic for the StakeFit Flagsmith experiments. This is NOT app code and never runs
// in production. It creates fake identities, asks Flagsmith which variation each one gets,
// records the exposures, then sends conversion events at configurable rates.
//
// Usage:
//   npm run simulate -- --users=1000 --late-night=0.3 --seed=7
//   npm run simulate -- --dry-run            # no network; preview the numbers the rates produce
//   npm run simulate -- --rates=./my-rates.json
//
// The rates model one funnel per identity:
//   exposed -> setup_completed -> challenge_created -> first_workout_done
// and encode the demo's story: no paywall gets more users through, the paywall and a higher
// stake bring users who actually work out.

import { Flagsmith } from '@flagsmith/nodejs'
import { readFileSync } from 'node:fs'
import {
  EXPERIMENT_EVENT,
  FLAG,
  TRAIT,
  readDefaultStake,
  readPaywallEnabled,
} from '../src/lib/experiments.ts'

type Rates = {
  // P(setup_completed) by the pre-selected stake.
  setupCompletedByStake: Record<string, number>
  // Late-night users are less likely to commit to a big stake.
  lateNightSetupMultiplierByStake: Record<string, number>
  // P(challenge_created | setup_completed): the paywall is a hurdle.
  challengeCreatedGivenSetup: { paywallOn: number; paywallOff: number }
  // P(first_workout_done | challenge_created): paying users show up.
  workoutGivenChallenge: { paywallOn: number; paywallOff: number }
  // A bigger stake makes a missed day hurt more.
  workoutMultiplierByStake: Record<string, number>
}

const DEFAULT_RATES: Rates = {
  setupCompletedByStake: { '5': 0.82, '10': 0.72, '20': 0.58 },
  lateNightSetupMultiplierByStake: { '5': 1, '10': 0.9, '20': 0.7 },
  challengeCreatedGivenSetup: { paywallOn: 0.45, paywallOff: 0.85 },
  workoutGivenChallenge: { paywallOn: 0.7, paywallOff: 0.25 },
  workoutMultiplierByStake: { '5': 0.6, '10': 1, '20': 1.6 },
}

type Options = {
  users: number
  lateNightShare: number
  seed: number
  runId: string
  concurrency: number
  dryRun: boolean
  rates: Rates
}

function parseArgs(argv: string[]): Options {
  const args = new Map<string, string>()
  for (const arg of argv) {
    const match = /^--([^=]+)(?:=(.*))?$/.exec(arg)
    // A bare flag like --dry-run has no "=value".
    if (match) args.set(match[1], match[2] || 'true')
  }
  const number = (name: string, fallback: number) => {
    const raw = args.get(name)
    if (raw === undefined) return fallback
    const value = Number(raw)
    if (!Number.isFinite(value)) throw new Error(`--${name} must be a number, got "${raw}"`)
    return value
  }
  const ratesPath = args.get('rates')
  const rates: Rates = ratesPath
    ? { ...DEFAULT_RATES, ...(JSON.parse(readFileSync(ratesPath, 'utf8')) as Partial<Rates>) }
    : DEFAULT_RATES
  return {
    users: Math.max(1, Math.floor(number('users', 1000))),
    lateNightShare: Math.min(1, Math.max(0, number('late-night', 0.3))),
    seed: Math.floor(number('seed', 42)),
    runId: args.get('run') ?? Date.now().toString(36),
    concurrency: Math.max(1, Math.floor(number('concurrency', 8))),
    dryRun: args.get('dry-run') === 'true',
    rates,
  }
}

// Deterministic per identity, so a rerun with the same --seed and --run tells the same story.
function rngFor(key: string): () => number {
  let hash = 2166136261
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  let state = hash >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rateFor(table: Record<string, number>, stake: number, fallback: number): number {
  return table[String(stake)] ?? fallback
}

const clamp = (p: number) => Math.min(0.95, Math.max(0, p))

type Outcome = {
  paywallEnabled: boolean
  stake: number
  lateNight: boolean
  setupCompleted: boolean
  challengeCreated: boolean
  firstWorkoutDone: boolean
}

function simulateFunnel(
  rng: () => number,
  rates: Rates,
  paywallEnabled: boolean,
  stake: number,
  lateNight: boolean,
): Omit<Outcome, 'paywallEnabled' | 'stake' | 'lateNight'> {
  const pSetup = clamp(
    rateFor(rates.setupCompletedByStake, stake, 0.7) *
      (lateNight ? rateFor(rates.lateNightSetupMultiplierByStake, stake, 1) : 1),
  )
  const setupCompleted = rng() < pSetup
  const pCreated = paywallEnabled
    ? rates.challengeCreatedGivenSetup.paywallOn
    : rates.challengeCreatedGivenSetup.paywallOff
  const challengeCreated = setupCompleted && rng() < clamp(pCreated)
  const pWorkout =
    (paywallEnabled
      ? rates.workoutGivenChallenge.paywallOn
      : rates.workoutGivenChallenge.paywallOff) * rateFor(rates.workoutMultiplierByStake, stake, 1)
  const firstWorkoutDone = challengeCreated && rng() < clamp(pWorkout)
  return { setupCompleted, challengeCreated, firstWorkoutDone }
}

async function mapWithConcurrency<T>(
  count: number,
  concurrency: number,
  task: (index: number) => Promise<T>,
): Promise<T[]> {
  const results = new Array<T>(count)
  let next = 0
  async function worker() {
    while (next < count) {
      const index = next
      next += 1
      results[index] = await task(index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, count) }, () => worker()))
  return results
}

function printSummary(outcomes: Outcome[]) {
  const pct = (part: number, whole: number) =>
    whole === 0 ? '   -  ' : `${((part / whole) * 100).toFixed(1).padStart(5)}%`
  const row = (label: string, group: Outcome[]) => {
    const setup = group.filter((o) => o.setupCompleted).length
    const created = group.filter((o) => o.challengeCreated).length
    const workout = group.filter((o) => o.firstWorkoutDone).length
    console.log(
      `${label.padEnd(18)} ${String(group.length).padStart(6)}  ${pct(setup, group.length)}   ${pct(created, group.length)}   ${pct(workout, group.length)}`,
    )
  }
  console.log('\nvariation          users   setup    created  workout   (rates per exposed user)')
  console.log('paywall_enabled')
  row(
    '  on (control)',
    outcomes.filter((o) => o.paywallEnabled),
  )
  row(
    '  off',
    outcomes.filter((o) => !o.paywallEnabled),
  )
  console.log('default_stake')
  for (const stake of [...new Set(outcomes.map((o) => o.stake))].sort((a, b) => a - b)) {
    row(
      `  $${stake}`,
      outcomes.filter((o) => o.stake === stake),
    )
  }
  console.log('late-night users')
  row(
    '  all',
    outcomes.filter((o) => o.lateNight),
  )
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const environmentKey = process.env.FLAGSMITH_ENVIRONMENT_KEY ?? ''
  if (!options.dryRun && !environmentKey) {
    throw new Error(
      'FLAGSMITH_ENVIRONMENT_KEY is not set. Use --dry-run to preview without Flagsmith.',
    )
  }

  const flagsmith = options.dryRun ? null : new Flagsmith({ environmentKey, enableEvents: true })

  console.log(
    `${options.dryRun ? '[dry run] ' : ''}Simulating ${options.users} users (run ${options.runId}, seed ${options.seed}, ${Math.round(options.lateNightShare * 100)}% late night)`,
  )

  let enrolled = 0
  let failures = 0
  const outcomes = await mapWithConcurrency(options.users, options.concurrency, async (index) => {
    const identifier = `sim-${options.runId}-${index}`
    const rng = rngFor(`${options.seed}:${identifier}`)
    const lateNight = rng() < options.lateNightShare

    let paywallEnabled: boolean
    let stake: number
    if (!flagsmith) {
      // Dry run: an even split stands in for Flagsmith's bucketing.
      paywallEnabled = rng() < 0.5
      stake = [5, 10, 20][Math.floor(rng() * 3)]
    } else {
      try {
        // Transient, like the app: the trait drives the late-night segment without being stored.
        const traits = { [TRAIT.lateNight]: { value: lateNight, transient: true } }
        const flags = await flagsmith.getIdentityFlags(identifier, traits)
        const byName = new Map(flags.allFlags().map((flag) => [flag.featureName, flag]))
        const paywallFlag = byName.get(FLAG.paywall)
        const stakeFlag = byName.get(FLAG.defaultStake)
        paywallEnabled = readPaywallEnabled(paywallFlag)
        stake = readDefaultStake(stakeFlag)
        // One evaluation, then an exposure per flag the identity is enrolled in (the documented
        // alternative to getExperimentFlag when evaluating once for several flags).
        for (const flag of [paywallFlag, stakeFlag]) {
          if (flag?.experiment?.inExperiment) {
            flagsmith.trackExposureEvent(flag.featureName, { identifier, value: flag.variant })
            enrolled += 1
          }
        }
      } catch (error) {
        failures += 1
        console.error(`[simulate] ${identifier}: flag evaluation failed:`, (error as Error).message)
        paywallEnabled = true
        stake = 10
      }
    }

    const funnel = simulateFunnel(rng, options.rates, paywallEnabled, stake, lateNight)
    if (flagsmith) {
      if (funnel.setupCompleted)
        flagsmith.trackEvent(EXPERIMENT_EVENT.setupCompleted, { identifier })
      if (funnel.challengeCreated) {
        flagsmith.trackEvent(EXPERIMENT_EVENT.challengeCreated, { identifier })
      }
      if (funnel.firstWorkoutDone) {
        flagsmith.trackEvent(EXPERIMENT_EVENT.firstWorkoutDone, { identifier })
      }
    }
    return { paywallEnabled, stake, lateNight, ...funnel }
  })

  printSummary(outcomes)

  if (flagsmith) {
    // The SDK buffers events; close() sends what is left before the process exits.
    await flagsmith.close()
    console.log(
      `\nSent exposures for ${enrolled} identity-experiment pairs${failures ? `, ${failures} evaluations failed` : ''}.`,
    )
    if (enrolled === 0) {
      console.warn(
        'No identity was enrolled. Check that both experiments are running and every variation has a key.',
      )
    }
    console.log('Refresh the experiment results in Flagsmith in about a minute.')
  }
}

main().catch((error: unknown) => {
  console.error('[simulate] failed:', error)
  process.exitCode = 1
})
