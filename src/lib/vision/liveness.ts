export type LivenessState = {
  ok: boolean
  reason: string | null
  isSpoof?: boolean
}

export interface LivenessGuardOptions {
  minFrameMs?: number
  maxGapMs?: number
}

/**
 * Frame Continuity Guard
 * Rejects frames arriving impossibly fast (duplicated playback) or after a long gap (paused/resumed).
 */
export function createLivenessGuard(opts?: LivenessGuardOptions) {
  const minFrameMs = opts?.minFrameMs ?? 8
  const maxGapMs = opts?.maxGapMs ?? 15_000
  let lastMs = 0
  let started = false

  return {
    onFrame(nowMs: number): LivenessState {
      if (!started) {
        started = true
        lastMs = nowMs
        return { ok: true, reason: null }
      }
      const dt = nowMs - lastMs
      lastMs = nowMs
      if (dt < minFrameMs) return { ok: false, reason: 'duplicate-frame' }
      if (dt > maxGapMs) return { ok: false, reason: 'gap' }

      return { ok: true, reason: null }
    },
    reset() {
      lastMs = 0
      started = false
    },
  }
}
