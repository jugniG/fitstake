import type { FrameEval, Landmark, Phase, RepCounter, RepResult } from './types'

export type RepCounterOptions = {
  evaluate: (landmarks: Landmark[] | null) => FrameEval
  minPhaseMs?: number
  minConfidence?: number
}

// Generic rep state machine: a rep is a baseline -> flexed -> baseline cycle. The flexed
// phase must be held for minPhaseMs before a return to baseline counts, which rejects
// impossibly fast / bouncing reps. Low-confidence or invisible frames never advance state.
export function createRepCounter(opts: RepCounterOptions): RepCounter {
  const minPhaseMs = opts.minPhaseMs ?? 250
  const minConfidence = opts.minConfidence ?? 0.5

  let reps = 0
  let phase: Phase = 'a'
  let phaseEnteredMs = 0
  let sawFlexed = false

  function onFrame(landmarks: Landmark[] | null, nowMs: number): RepResult {
    if (landmarks == null) {
      return { phase, reps, repCounted: false, warning: 'no-body', confidence: 0 }
    }

    const result = opts.evaluate(landmarks)
    if (!result.visible || result.confidence < minConfidence) {
      return { phase, reps, repCounted: false, warning: !result.visible ? 'no-body' : 'low-confidence', confidence: result.confidence }
    }

    if (result.phase === phase) {
      if (phase === 'b' && nowMs - phaseEnteredMs >= minPhaseMs) sawFlexed = true
      return { phase, reps, repCounted: false, warning: null, confidence: result.confidence }
    }

    if (result.phase === 'b' && phase === 'a') {
      phase = 'b'
      phaseEnteredMs = nowMs
      sawFlexed = false
      return { phase, reps, repCounted: false, warning: null, confidence: result.confidence }
    }

    // result.phase === 'a' && phase === 'b'
    const counted = sawFlexed
    phase = 'a'
    phaseEnteredMs = nowMs
    if (counted) {
      reps += 1
      sawFlexed = false
      return { phase, reps, repCounted: true, warning: null, confidence: result.confidence }
    }
    sawFlexed = false
    return { phase, reps, repCounted: false, warning: 'rep-too-fast', confidence: result.confidence }
  }

  return {
    onFrame,
    get reps() {
      return reps
    },
    reset() {
      reps = 0
      phase = 'a'
      phaseEnteredMs = 0
      sawFlexed = false
    },
  }
}
