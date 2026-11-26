// Shared vision types. Landmark mirrors @mediapipe/tasks-vision's NormalizedLandmark.

export type Landmark = { x: number; y: number; z: number; visibility?: number }

// 'a' = baseline/rest, 'b' = flexed/contracted. One a -> b -> a cycle is one rep.
export type Phase = 'a' | 'b'

export type FrameEval = { phase: Phase; confidence: number; visible: boolean }

export type RepResult = {
  phase: Phase
  reps: number
  repCounted: boolean
  warning: string | null
  confidence: number
}

export interface RepCounter {
  onFrame: (landmarks: Landmark[] | null, nowMs: number) => RepResult
  readonly reps: number
  reset: () => void
}
