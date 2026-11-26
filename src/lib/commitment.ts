import { z } from 'zod'

export const DEMO_STORAGE_KEY = 'workout-commitment:demo:v1'
export const DEMO_NOTICE = 'Demo: no real money moves'
export const VERIFICATION_PENDING = 'Method undecided'

const exerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
})

const planSchema = z.object({
  id: z.string().min(1),
  exercises: z.array(exerciseSchema).min(1),
  dailyAmount: z.number().int().positive(),
  durationDays: z.number().int().positive(),
  createdAt: z.string().min(1),
})

const captureSchema = z.object({
  status: z.enum(['captured', 'interrupted', 'failed']),
  capturedAt: z.string().min(1),
  durationSeconds: z.number().nonnegative(),
  note: z.string().optional(),
})

const depositEventSchema = z.object({
  id: z.string().min(1),
  type: z.literal('demo_deposit'),
  amount: z.number().int().positive(),
  createdAt: z.string().min(1),
})

const settlementEventSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['demo_return', 'demo_loss']),
  amount: z.number().int().positive(),
  day: z.number().int().positive(),
  createdAt: z.string().min(1),
})

const ledgerEventSchema = z.union([depositEventSchema, settlementEventSchema])

const commitmentStateSchema = z.object({
  version: z.literal(1),
  plan: planSchema.nullable(),
  ledger: z.array(ledgerEventSchema),
  captures: z.record(z.string(), captureSchema),
})

export type Exercise = z.infer<typeof exerciseSchema>
export type CommitmentPlan = z.infer<typeof planSchema>
export type CaptureSummary = z.infer<typeof captureSchema>
export type DepositEvent = z.infer<typeof depositEventSchema>
export type SettlementEvent = z.infer<typeof settlementEventSchema>
export type LedgerEvent = z.infer<typeof ledgerEventSchema>
export type CommitmentState = z.infer<typeof commitmentStateSchema>

export type DayStatus = 'locked' | 'open' | 'returned' | 'lost'
export type SettleOutcome = 'returned' | 'lost'

export type DayAllocation = {
  day: number
  amount: number
  status: DayStatus
  capture: CaptureSummary | null
  settlement: SettlementEvent | null
}

export type CommitmentTotals = {
  returned: number
  lost: number
  locked: number
  atStake: number
  total: number
  settledDays: number
  totalDays: number
}

export type CreateCommitmentInput = {
  exercises: Exercise[]
  dailyAmount: number
  durationDays: number
}

type IdFactory = () => string
type Clock = () => string

const defaultIdFactory: IdFactory = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const defaultClock: Clock = () => new Date().toISOString()

export function emptyCommitmentState(): CommitmentState {
  return { version: 1, plan: null, ledger: [], captures: {} }
}

export function createCommitment(
  input: CreateCommitmentInput,
  options: { now?: string; newId?: IdFactory } = {},
): CommitmentState {
  const now = options.now ?? defaultClock()
  const newId = options.newId ?? defaultIdFactory
  const total = input.dailyAmount * input.durationDays

  const plan: CommitmentPlan = {
    id: newId(),
    exercises: input.exercises.map((exercise) => ({ ...exercise, name: exercise.name.trim() })),
    dailyAmount: input.dailyAmount,
    durationDays: input.durationDays,
    createdAt: now,
  }

  return {
    version: 1,
    plan,
    ledger: [
      {
        id: newId(),
        type: 'demo_deposit',
        amount: total,
        createdAt: now,
      },
    ],
    captures: {},
  }
}

export function isSettlementEvent(event: LedgerEvent): event is SettlementEvent {
  return event.type === 'demo_return' || event.type === 'demo_loss'
}

export function settlementForDay(state: CommitmentState, day: number): SettlementEvent | null {
  return (
    state.ledger.find(
      (event): event is SettlementEvent => isSettlementEvent(event) && event.day === day,
    ) ?? null
  )
}

export function getOpenDay(state: CommitmentState): number | null {
  if (!state.plan) return null

  const settledDays = new Set(state.ledger.filter(isSettlementEvent).map((event) => event.day))

  for (let day = 1; day <= state.plan.durationDays; day += 1) {
    if (!settledDays.has(day)) return day
  }

  return null
}

export function getDayStatus(state: CommitmentState, day: number): DayStatus {
  const settlement = settlementForDay(state, day)
  if (settlement) return settlement.type === 'demo_return' ? 'returned' : 'lost'
  return getOpenDay(state) === day ? 'open' : 'locked'
}

export function buildDayAllocations(state: CommitmentState): DayAllocation[] {
  if (!state.plan) return []

  const openDay = getOpenDay(state)

  return Array.from({ length: state.plan.durationDays }, (_, index) => {
    const day = index + 1
    const settlement = settlementForDay(state, day)
    const status: DayStatus = settlement
      ? settlement.type === 'demo_return'
        ? 'returned'
        : 'lost'
      : openDay === day
        ? 'open'
        : 'locked'

    return {
      day,
      amount: state.plan!.dailyAmount,
      status,
      capture: state.captures[String(day)] ?? null,
      settlement,
    }
  })
}

export function getCommitmentTotals(state: CommitmentState): CommitmentTotals {
  if (!state.plan) {
    return {
      returned: 0,
      lost: 0,
      locked: 0,
      atStake: 0,
      total: 0,
      settledDays: 0,
      totalDays: 0,
    }
  }

  const allocations = buildDayAllocations(state)
  const returned = sum(
    state.ledger
      .filter((event): event is SettlementEvent => event.type === 'demo_return')
      .map((event) => event.amount),
  )
  const lost = sum(
    state.ledger
      .filter((event): event is SettlementEvent => event.type === 'demo_loss')
      .map((event) => event.amount),
  )
  const locked = sum(
    allocations
      .filter((allocation) => allocation.status === 'locked')
      .map((allocation) => allocation.amount),
  )
  const atStake = sum(
    allocations
      .filter((allocation) => allocation.status === 'open')
      .map((allocation) => allocation.amount),
  )

  return {
    returned,
    lost,
    locked,
    atStake,
    total: state.plan.dailyAmount * state.plan.durationDays,
    settledDays: state.ledger.filter(isSettlementEvent).length,
    totalDays: state.plan.durationDays,
  }
}

export type SettlementResult =
  | { ok: true; state: CommitmentState; event: SettlementEvent; day: number }
  | { ok: false; reason: 'no-plan' | 'closed' | 'not-open' | 'already-settled' }

export function settleDay(
  state: CommitmentState,
  day: number,
  outcome: SettleOutcome,
  options: { now?: string; newId?: IdFactory } = {},
): SettlementResult {
  if (!state.plan) return { ok: false, reason: 'no-plan' }

  const existingSettlement = settlementForDay(state, day)
  if (existingSettlement) return { ok: false, reason: 'already-settled' }

  const openDay = getOpenDay(state)
  if (openDay === null) return { ok: false, reason: 'closed' }
  if (openDay !== day) return { ok: false, reason: 'not-open' }

  const now = options.now ?? defaultClock()
  const newId = options.newId ?? defaultIdFactory
  const event: SettlementEvent = {
    id: newId(),
    type: outcome === 'returned' ? 'demo_return' : 'demo_loss',
    amount: state.plan.dailyAmount,
    day,
    createdAt: now,
  }

  return {
    ok: true,
    day,
    event,
    state: { ...state, ledger: [...state.ledger, event] },
  }
}

export function settleNextDay(
  state: CommitmentState,
  outcome: SettleOutcome,
  options: { now?: string; newId?: IdFactory } = {},
): SettlementResult {
  const openDay = getOpenDay(state)
  if (openDay === null) return { ok: false, reason: 'closed' }
  return settleDay(state, openDay, outcome, options)
}

export type CaptureSaveResult =
  | { ok: true; state: CommitmentState }
  | { ok: false; reason: 'no-plan' | 'closed' | 'not-open' | 'already-settled' }

export function saveCapture(
  state: CommitmentState,
  day: number,
  capture: CaptureSummary,
): CaptureSaveResult {
  if (!state.plan) return { ok: false, reason: 'no-plan' }
  if (day < 1 || day > state.plan.durationDays) return { ok: false, reason: 'not-open' }
  if (settlementForDay(state, day)) return { ok: false, reason: 'already-settled' }
  if (getOpenDay(state) !== day) return { ok: false, reason: 'not-open' }

  return {
    ok: true,
    state: {
      ...state,
      captures: { ...state.captures, [String(day)]: capture },
    },
  }
}

export function parseStoredCommitment(raw: string | null): CommitmentState | null {
  if (!raw) return null

  try {
    const parsed = commitmentStateSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      console.error('[commitment] rejected malformed local demo state:', parsed.error.message)
      return null
    }
    if (!isCoherentCommitment(parsed.data)) {
      console.error('[commitment] rejected inconsistent local demo state')
      return null
    }
    return parsed.data
  } catch (error) {
    console.error('[commitment] could not parse local demo state:', error)
    return null
  }
}

export function isCoherentCommitment(state: CommitmentState): boolean {
  if (!state.plan) {
    return state.ledger.length === 0 && Object.keys(state.captures).length === 0
  }

  const { plan } = state
  const total = plan.dailyAmount * plan.durationDays
  const deposits = state.ledger.filter((event) => event.type === 'demo_deposit')
  if (deposits.length !== 1 || deposits[0].amount !== total) return false

  const settlements = state.ledger.filter(isSettlementEvent)
  const settledDays = new Set<number>()

  for (const event of settlements) {
    if (settledDays.has(event.day)) return false
    if (event.day < 1 || event.day > plan.durationDays) return false
    if (event.amount !== plan.dailyAmount) return false
    settledDays.add(event.day)
  }

  // Settlement is sequential by design: a day can only settle once every earlier day has.
  for (let day = 1; day <= settlements.length; day += 1) {
    if (!settledDays.has(day)) return false
  }

  const lastRecordableDay = Math.min(settlements.length + 1, plan.durationDays)
  for (const [day, capture] of Object.entries(state.captures)) {
    const dayNumber = Number(day)
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > plan.durationDays) {
      return false
    }
    if (dayNumber > lastRecordableDay) return false
    if (!capture.capturedAt) return false
  }

  return true
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}
