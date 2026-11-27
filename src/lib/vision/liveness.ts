import type { ExerciseType } from '#/lib/challenge'
import type { Landmark } from './types'

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
 * Liveness & Anti-Spoofing Guard
 *
 * Enforces physiological and optical physical constraints to prevent fraud:
 * 1. Frame spacing continuity (rejects duplicated or sped-up video feeds)
 * 2. Miniature Screen Replay Detection:
 *    When someone holds up a smartphone or tablet playing a workout video in front of the camera,
 *    MediaPipe identifies full-body human landmarks. However, a full-body skeleton displayed on a
 *    handheld screen occupies a tiny fraction of the webcam's optical field of view (< 40% vertical
 *    height or < 32% width). A living person exercising in a room 5-8 feet away occupies >= 48% height
 *    (or >= 45% width for horizontal movements like push-ups).
 * 3. Unnatural Vertical Screen Offsetting:
 *    A full standing body restricted completely to the lower half of the frame (minY > 0.42) indicates
 *    a phone placed at the bottom of the camera view.
 */
export function createLivenessGuard(opts?: LivenessGuardOptions) {
  const minFrameMs = opts?.minFrameMs ?? 8
  const maxGapMs = opts?.maxGapMs ?? 15_000
  let lastMs = 0
  let started = false
  let consecutiveSpoofCount = 0

  return {
    onFrame(
      nowMs: number,
      landmarks?: Landmark[] | null,
      exerciseType?: ExerciseType,
    ): LivenessState {
      if (!started) {
        started = true
        lastMs = nowMs
        return { ok: true, reason: null }
      }
      const dt = nowMs - lastMs
      lastMs = nowMs
      if (dt < minFrameMs) return { ok: false, reason: 'duplicate-frame' }
      if (dt > maxGapMs) return { ok: false, reason: 'gap' }

      if (landmarks && landmarks.length >= 33) {
        const leftShoulder = landmarks[11]
        const rightShoulder = landmarks[12]
        const leftHip = landmarks[23]
        const rightHip = landmarks[24]
        const leftKnee = landmarks[25]
        const rightKnee = landmarks[26]
        const leftAnkle = landmarks[27]
        const rightAnkle = landmarks[28]

        const hasShoulders =
          (leftShoulder.visibility ?? 0) > 0.35 || (rightShoulder.visibility ?? 0) > 0.35
        const hasHips = (leftHip.visibility ?? 0) > 0.35 || (rightHip.visibility ?? 0) > 0.35
        const hasLower =
          (leftKnee.visibility ?? 0) > 0.35 ||
          (rightKnee.visibility ?? 0) > 0.35 ||
          (leftAnkle.visibility ?? 0) > 0.35 ||
          (rightAnkle.visibility ?? 0) > 0.35

        // If full body is visible
        if (hasShoulders && hasHips && hasLower) {
          let minY = 1
          let maxY = 0
          let minX = 1
          let maxX = 0
          let validCount = 0

          for (const lm of landmarks) {
            if ((lm.visibility ?? 1) > 0.3) {
              if (lm.y < minY) minY = lm.y
              if (lm.y > maxY) maxY = lm.y
              if (lm.x < minX) minX = lm.x
              if (lm.x > maxX) maxX = lm.x
              validCount++
            }
          }

          if (validCount >= 10) {
            const bboxHeight = maxY - minY
            const bboxWidth = maxX - minX

            const isFloorMovement = exerciseType === 'push_up' || exerciseType === 'leg_raise'

            if (isFloorMovement) {
              // Floor movements: real human stretches horizontally across the mat (bboxWidth >= 0.45).
              // A phone replay playing push-ups has both small width (< 0.38) and small height (< 0.28).
              if (bboxWidth < 0.38 && bboxHeight < 0.28) {
                consecutiveSpoofCount++
                if (consecutiveSpoofCount >= 2) {
                  return {
                    ok: false,
                    reason:
                      'Screen replay detected: miniature video feed. Please perform exercise directly in camera view.',
                    isSpoof: true,
                  }
                }
              } else {
                consecutiveSpoofCount = Math.max(0, consecutiveSpoofCount - 1)
              }
            } else {
              // Standing movements (squats, jumping jacks):
              // 1. Miniature display scale check:
              const isMiniatureScale = bboxHeight < 0.4 && bboxWidth < 0.35
              // 2. Unnatural lower-screen offset (full body crammed into bottom half):
              const isLowerScreenCrammed = minY > 0.42 && bboxHeight < 0.5

              if (isMiniatureScale || isLowerScreenCrammed) {
                consecutiveSpoofCount++
                if (consecutiveSpoofCount >= 2) {
                  return {
                    ok: false,
                    reason:
                      'Screen replay detected: miniature video feed. Please perform exercise directly in camera view.',
                    isSpoof: true,
                  }
                }
              } else {
                consecutiveSpoofCount = Math.max(0, consecutiveSpoofCount - 1)
              }
            }
          }
        }
      }

      return { ok: true, reason: null }
    },
    reset() {
      lastMs = 0
      started = false
      consecutiveSpoofCount = 0
    },
  }
}
