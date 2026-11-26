import type { CustomGesture, ExerciseType } from '#/lib/challenge'
import type { Landmark } from './types'

// MediaPipe 33 Pose Landmark indices
const POSE_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [11, 12], // shoulders
  [11, 13],
  [13, 15], // left arm
  [12, 14],
  [14, 16], // right arm
  [11, 23],
  [12, 24], // torso sides
  [23, 24], // hips
  [23, 25],
  [25, 27], // left leg
  [24, 26],
  [26, 28], // right leg
  [27, 29],
  [28, 30], // feet
]

const KEY_JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]

// MediaPipe 21 Hand Landmark connections
const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4], // thumb
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8], // index
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12], // middle
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16], // ring
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20], // pinky
  [5, 9],
  [9, 13],
  [13, 17], // palm
]

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: (Landmark | undefined)[] | null,
  width: number,
  height: number,
  isHand = false,
): void {
  ctx.clearRect(0, 0, width, height)
  if (!landmarks || landmarks.length === 0) return

  if (isHand) {
    drawHand(ctx, landmarks, width, height)
  } else {
    drawPose(ctx, landmarks, width, height)
  }
}

function drawPose(
  ctx: CanvasRenderingContext2D,
  landmarks: (Landmark | undefined)[],
  width: number,
  height: number,
): void {
  ctx.lineWidth = 3
  ctx.lineCap = 'round'

  // Draw bone connections
  for (const [i, j] of POSE_CONNECTIONS) {
    const p1 = landmarks[i]
    const p2 = landmarks[j]
    if (!p1 || !p2) continue

    const v1 = p1.visibility ?? 1
    const v2 = p2.visibility ?? 1
    if (v1 < 0.3 || v2 < 0.3) continue

    // Green if high confidence, yellow/amber if borderline
    const avgV = (v1 + v2) / 2
    ctx.strokeStyle = avgV > 0.65 ? 'rgba(74, 222, 128, 0.75)' : 'rgba(251, 191, 36, 0.65)'

    ctx.beginPath()
    ctx.moveTo(p1.x * width, p1.y * height)
    ctx.lineTo(p2.x * width, p2.y * height)
    ctx.stroke()
  }

  // Draw joint markers
  for (const idx of KEY_JOINTS) {
    const pt = landmarks[idx]
    if (!pt) continue

    const vis = pt.visibility ?? 1
    if (vis < 0.25) continue

    const isConfident = vis > 0.55
    ctx.beginPath()
    ctx.arc(pt.x * width, pt.y * height, isConfident ? 5 : 3.5, 0, 2 * Math.PI)
    ctx.fillStyle = isConfident ? '#4ade80' : '#fbbf24'
    ctx.fill()
    ctx.strokeStyle = '#050505'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  landmarks: (Landmark | undefined)[],
  width: number,
  height: number,
): void {
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(74, 222, 128, 0.75)'

  for (const [i, j] of HAND_CONNECTIONS) {
    const p1 = landmarks[i]
    const p2 = landmarks[j]
    if (!p1 || !p2) continue
    ctx.beginPath()
    ctx.moveTo(p1.x * width, p1.y * height)
    ctx.lineTo(p2.x * width, p2.y * height)
    ctx.stroke()
  }

  for (let i = 0; i < landmarks.length; i++) {
    const pt = landmarks[i]
    if (!pt) continue
    ctx.beginPath()
    ctx.arc(pt.x * width, pt.y * height, 4, 0, 2 * Math.PI)
    ctx.fillStyle = i === 4 || i === 8 ? '#f87171' : '#4ade80' // highlight thumb & index
    ctx.fill()
    ctx.strokeStyle = '#050505'
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

/**
 * Returns human-friendly form feedback based on joint visibility and exercise mechanics.
 */
export function getExerciseFeedback(
  exerciseType: ExerciseType,
  _customGesture: CustomGesture | null,
  landmarks: Landmark[] | null,
  warning: string | null,
): { message: string; isError: boolean } {
  if (!landmarks || landmarks.length === 0) {
    return {
      message: 'Step into frame — looking for your body…',
      isError: true,
    }
  }

  if (exerciseType === 'custom_gesture') {
    if (warning === 'no-body' || warning === 'low-confidence') {
      return { message: 'Hold hand clearly inside the frame', isError: true }
    }
    return { message: 'Hand tracked — perform the gesture', isError: false }
  }

  // Check specific landmark visibility for standing movements
  const hasUpper = (landmarks[11]?.visibility ?? 0) > 0.4 || (landmarks[12]?.visibility ?? 0) > 0.4
  const hasHips = (landmarks[23]?.visibility ?? 0) > 0.4 || (landmarks[24]?.visibility ?? 0) > 0.4
  const hasKnees = (landmarks[25]?.visibility ?? 0) > 0.4 || (landmarks[26]?.visibility ?? 0) > 0.4
  const hasAnkles = (landmarks[27]?.visibility ?? 0) > 0.4 || (landmarks[28]?.visibility ?? 0) > 0.4

  if (exerciseType === 'squat') {
    if (hasUpper && (!hasHips || !hasKnees)) {
      return {
        message: 'Step back 2-3 steps or tilt screen down so hips & knees fit',
        isError: true,
      }
    }
    if (hasUpper && hasHips && hasKnees && !hasAnkles) {
      return {
        message: 'Hips & knees tracked — squat until thighs are parallel to ground',
        isError: false,
      }
    }
    if (warning === 'rep-too-fast') {
      return {
        message: 'Squat deeper and pause for a half-second at the bottom',
        isError: true,
      }
    }
    if (warning === 'no-body' || warning === 'low-confidence') {
      return {
        message: 'Make sure your hips and knees are visible in frame',
        isError: true,
      }
    }
    return { message: 'Body tracked — squat until thighs are parallel to ground', isError: false }
  }

  if (exerciseType === 'push_up') {
    if (!hasHips || !hasUpper) {
      return {
        message: 'Position camera to your side so shoulders, hips, and knees fit',
        isError: true,
      }
    }
    if (warning === 'rep-too-fast') {
      return { message: 'Lower chest fully and pause briefly before pushing up', isError: true }
    }
    return { message: 'In position — lower chest to ground, then press up', isError: false }
  }

  // jumping_jack
  if (!hasAnkles || !hasUpper) {
    return {
      message: 'Step back so full body and overhead reach fit in frame',
      isError: true,
    }
  }
  return { message: 'Jump feet wide and clap hands overhead', isError: false }
}
