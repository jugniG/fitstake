export type LivenessState = { ok: boolean; reason: string | null }

// Best-effort frame-continuity guard: rejects frames arriving impossibly fast (duplicated or
// sped-up playback) or after a long gap (paused/resumed). Live getUserMedia advances ~real-time.
export function createLivenessGuard(opts?: { minFrameMs?: number; maxGapMs?: number }) {
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
