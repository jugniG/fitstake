import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  DEMO_STORAGE_KEY,
  createCommitment,
  emptyCommitmentState,
  parseStoredCommitment,
  saveCapture as saveCaptureInState,
  settleNextDay,
} from '#/lib/commitment'
import type {
  CaptureSummary,
  CommitmentState,
  CreateCommitmentInput,
  SettleOutcome,
} from '#/lib/commitment'
import { formatINR } from '#/lib/format'

export type StoreActionResult = {
  ok: boolean
  message: string
  day?: number
}

type CommitmentContextValue = {
  state: CommitmentState
  hydrated: boolean
  storageWarning: string | null
  createPlan: (input: CreateCommitmentInput) => StoreActionResult
  recordCapture: (day: number, capture: CaptureSummary) => StoreActionResult
  previewSettlement: (outcome: SettleOutcome) => StoreActionResult
  resetDemo: () => void
}

const CommitmentContext = createContext<CommitmentContextValue | null>(null)

type LoadedState = {
  state: CommitmentState
  warning: string | null
}

export function CommitmentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CommitmentState>(emptyCommitmentState)
  const [hydrated, setHydrated] = useState(false)
  const [storageWarning, setStorageWarning] = useState<string | null>(null)
  const stateRef = useRef(state)

  const commit = useCallback((next: CommitmentState) => {
    stateRef.current = next
    setState(next)

    try {
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next))
      setStorageWarning(null)
    } catch (error) {
      console.error('[commitment] failed to persist the local demo state:', error)
      setStorageWarning(
        'Local storage is unavailable. Changes remain in memory but will reset on refresh.',
      )
    }
  }, [])

  useEffect(() => {
    const loaded = readInitialState()
    stateRef.current = loaded.state
    setState(loaded.state)
    setStorageWarning(loaded.warning)
    setHydrated(true)

    const onStorage = (event: StorageEvent) => {
      if (event.key !== DEMO_STORAGE_KEY) return

      const parsed = event.newValue ? parseStoredCommitment(event.newValue) : emptyCommitmentState()
      if (!parsed) {
        setStorageWarning('Another tab wrote demo state this app could not read.')
        return
      }

      stateRef.current = parsed
      setState(parsed)
      setStorageWarning(null)
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const createPlan = useCallback(
    (input: CreateCommitmentInput): StoreActionResult => {
      if (stateRef.current.plan) {
        return { ok: false, message: 'A commitment already exists. Reset the demo to start over.' }
      }

      const next = createCommitment(input)
      commit(next)
      return {
        ok: true,
        message: `Demo commitment created: ${formatINR(next.plan?.dailyAmount ?? 0)} for ${input.durationDays} days.`,
      }
    },
    [commit],
  )

  const recordCapture = useCallback(
    (day: number, capture: CaptureSummary): StoreActionResult => {
      const result = saveCaptureInState(stateRef.current, day, capture)
      if (!result.ok) {
        const message =
          result.reason === 'no-plan'
            ? 'No commitment is active.'
            : 'This session can no longer accept a capture because the open day changed or settled.'
        return { ok: false, message }
      }

      commit(result.state)
      return {
        ok: true,
        message: 'Demo capture summary saved. Verification is still pending and no money moved.',
        day,
      }
    },
    [commit],
  )

  const previewSettlement = useCallback(
    (outcome: SettleOutcome): StoreActionResult => {
      const result = settleNextDay(stateRef.current, outcome)
      if (!result.ok) {
        const message =
          result.reason === 'no-plan'
            ? 'Create a demo commitment before previewing a settlement.'
            : result.reason === 'closed'
              ? 'Every day already has a demo settlement.'
              : 'That allocation is already settled.'
        return { ok: false, message }
      }

      commit(result.state)
      const moneyMessage = `Demo: ${formatINR(result.event.amount)} ${
        outcome === 'returned' ? 'returned' : 'lost'
      }`
      return {
        ok: true,
        message: `${moneyMessage} for day ${result.day}.`,
        day: result.day,
      }
    },
    [commit],
  )

  const resetDemo = useCallback(() => {
    const next = emptyCommitmentState()
    stateRef.current = next
    setState(next)

    try {
      window.localStorage.removeItem(DEMO_STORAGE_KEY)
      setStorageWarning(null)
    } catch (error) {
      console.error('[commitment] failed to clear the local demo state:', error)
      setStorageWarning('Could not clear local storage, but the in-memory demo was reset.')
    }
  }, [])

  const value = useMemo<CommitmentContextValue>(
    () => ({
      state,
      hydrated,
      storageWarning,
      createPlan,
      recordCapture,
      previewSettlement,
      resetDemo,
    }),
    [state, hydrated, storageWarning, createPlan, recordCapture, previewSettlement, resetDemo],
  )

  return <CommitmentContext.Provider value={value}>{children}</CommitmentContext.Provider>
}

export function useCommitment(): CommitmentContextValue {
  const context = useContext(CommitmentContext)
  if (!context) {
    throw new Error('useCommitment must be used inside CommitmentProvider')
  }
  return context
}

function readInitialState(): LoadedState {
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY)
    if (!raw) return { state: emptyCommitmentState(), warning: null }

    const parsed = parseStoredCommitment(raw)
    if (!parsed) {
      return {
        state: emptyCommitmentState(),
        warning: 'The saved demo state could not be read and was ignored.',
      }
    }

    return { state: parsed, warning: null }
  } catch (error) {
    console.error('[commitment] failed to read the local demo state:', error)
    return {
      state: emptyCommitmentState(),
      warning:
        'Local storage is unavailable. The demo will work in memory but will reset on refresh.',
    }
  }
}
