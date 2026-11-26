import { describe, expect, it, vi } from 'vitest'
import {
  buildDayAllocations,
  createCommitment,
  getCommitmentTotals,
  getOpenDay,
  isCoherentCommitment,
  parseStoredCommitment,
  saveCapture,
  settleDay,
  settleNextDay,
} from './commitment'
import type { CaptureSummary, Exercise } from './commitment'

const now = '2026-11-16T10:00:00.000Z'

const exercises: Exercise[] = [
  { id: 'exercise-1', name: 'Push-ups', sets: 3, reps: 12 },
  { id: 'exercise-2', name: 'Squats', sets: 3, reps: 15 },
]

const capture: CaptureSummary = {
  status: 'captured',
  capturedAt: now,
  durationSeconds: 42,
}

function sequentialIds() {
  let next = 0
  return () => `id-${++next}`
}

function createTestCommitment(durationDays = 10, dailyAmount = 1_000) {
  return createCommitment({ exercises, dailyAmount, durationDays }, { now, newId: sequentialIds() })
}

describe('commitment allocations', () => {
  it('builds exactly the number of daily allocations chosen by the user', () => {
    const state = createTestCommitment(7, 250)
    const allocations = buildDayAllocations(state)

    expect(allocations).toHaveLength(7)
    expect(allocations.map((allocation) => allocation.day)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(allocations.every((allocation) => allocation.amount === 250)).toBe(true)
    expect(allocations[0].status).toBe('open')
    expect(allocations.slice(1).every((allocation) => allocation.status === 'locked')).toBe(true)
  })

  it('uses a different duration and amount without carrying sample limits', () => {
    const state = createTestCommitment(21, 75)
    const allocations = buildDayAllocations(state)

    expect(allocations).toHaveLength(21)
    expect(state.ledger[0]).toMatchObject({ type: 'demo_deposit', amount: 1_575 })
    expect(getCommitmentTotals(state).total).toBe(1_575)
  })
})

describe('demo settlement invariants', () => {
  it('returns only the open day and advances the open day', () => {
    const state = createTestCommitment(3, 1_000)
    const result = settleNextDay(state, 'returned', { now, newId: sequentialIds() })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.day).toBe(1)
    expect(result.event.amount).toBe(1_000)
    expect(getOpenDay(result.state)).toBe(2)
    expect(buildDayAllocations(result.state)[0].status).toBe('returned')
  })

  it('refuses to settle the same daily allocation twice', () => {
    const state = createTestCommitment(3, 1_000)
    const first = settleDay(state, 1, 'returned', { now, newId: sequentialIds() })
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const second = settleDay(first.state, 1, 'lost', { now, newId: sequentialIds() })

    expect(second).toEqual({ ok: false, reason: 'already-settled' })
    expect(first.state.ledger.filter((event) => 'day' in event && event.day === 1)).toHaveLength(1)
    expect(buildDayAllocations(first.state)[0].status).toBe('returned')
  })

  it('never settles a future or non-open allocation', () => {
    const state = createTestCommitment(4, 500)

    expect(settleDay(state, 3, 'returned', { now, newId: sequentialIds() })).toEqual({
      ok: false,
      reason: 'not-open',
    })
    expect(settleDay(state, 1, 'lost', { now, newId: sequentialIds() }).ok).toBe(true)
  })

  it('reconciles returned, lost, locked and at-stake totals', () => {
    const state = createTestCommitment(5, 1_000)
    const returned = settleNextDay(state, 'returned', { now, newId: sequentialIds() })
    expect(returned.ok).toBe(true)
    if (!returned.ok) return

    const lost = settleNextDay(returned.state, 'lost', { now, newId: sequentialIds() })
    expect(lost.ok).toBe(true)
    if (!lost.ok) return

    const totals = getCommitmentTotals(lost.state)

    expect(totals).toMatchObject({
      returned: 1_000,
      lost: 1_000,
      locked: 2_000,
      atStake: 1_000,
      total: 5_000,
      settledDays: 2,
      totalDays: 5,
    })
    expect(totals.returned + totals.lost + totals.locked + totals.atStake).toBe(totals.total)
  })

  it('closes after every day has a demo outcome', () => {
    let state = createTestCommitment(2, 100)

    const first = settleNextDay(state, 'returned', { now, newId: sequentialIds() })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    state = first.state

    const second = settleNextDay(state, 'lost', { now, newId: sequentialIds() })
    expect(second.ok).toBe(true)
    if (!second.ok) return
    state = second.state

    expect(getOpenDay(state)).toBeNull()
    expect(settleNextDay(state, 'lost')).toEqual({ ok: false, reason: 'closed' })
    expect(getCommitmentTotals(state)).toMatchObject({
      returned: 100,
      lost: 100,
      locked: 0,
      atStake: 0,
    })
  })
})

describe('capture records stay separate from settlement', () => {
  it('saves capture metadata without changing the ledger or totals', () => {
    const state = createTestCommitment(3, 1_000)
    const beforeTotals = getCommitmentTotals(state)
    const result = saveCapture(state, 1, capture)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.state.captures['1']).toEqual(capture)
    expect(result.state.ledger).toEqual(state.ledger)
    expect(getCommitmentTotals(result.state)).toEqual(beforeTotals)
    expect(getOpenDay(result.state)).toBe(1)
  })

  it('does not accept a capture for a future, settled or missing day', () => {
    const state = createTestCommitment(3, 1_000)
    const returned = settleDay(state, 1, 'returned', { now, newId: sequentialIds() })
    expect(returned.ok).toBe(true)
    if (!returned.ok) return

    expect(saveCapture(state, 2, capture)).toEqual({ ok: false, reason: 'not-open' })
    expect(saveCapture(returned.state, 1, capture)).toEqual({
      ok: false,
      reason: 'already-settled',
    })
    expect(saveCapture(state, 8, capture)).toEqual({ ok: false, reason: 'not-open' })
  })
})

describe('stored demo state', () => {
  it('round-trips coherent state', () => {
    const state = createTestCommitment(2, 1_000)
    const parsed = parseStoredCommitment(JSON.stringify(state))

    expect(parsed).toEqual(state)
    expect(parsed && isCoherentCommitment(parsed)).toBe(true)
  })

  it('rejects duplicate settlements for the same day', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const state = createTestCommitment(2, 1_000)
    const settled = settleDay(state, 1, 'returned', { now, newId: sequentialIds() })
    expect(settled.ok).toBe(true)
    if (!settled.ok) return

    const duplicate = {
      ...settled.event,
      id: 'duplicate-settlement',
      type: 'demo_loss' as const,
    }
    const tampered = {
      ...settled.state,
      ledger: [...settled.state.ledger, duplicate],
    }

    expect(isCoherentCommitment(tampered)).toBe(false)
    expect(parseStoredCommitment(JSON.stringify(tampered))).toBeNull()
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('rejects settlements that skip an earlier day', () => {
    const state = createTestCommitment(3, 1_000)
    const settled = settleDay(state, 1, 'returned', { now, newId: sequentialIds() })
    expect(settled.ok).toBe(true)
    if (!settled.ok) return

    const tampered = {
      ...settled.state,
      ledger: state.ledger.concat({ ...settled.event, day: 2 }),
    }

    expect(isCoherentCommitment(tampered)).toBe(false)
  })

  it('rejects a capture summary for a still-locked day', () => {
    const state = createTestCommitment(3, 1_000)
    const tampered = {
      ...state,
      captures: { '2': capture },
    }

    expect(isCoherentCommitment(tampered)).toBe(false)
  })
})
