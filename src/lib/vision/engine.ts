import { FilesetResolver, HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision'
import type { ExerciseType } from '#/lib/challenge'
import type { Landmark } from './types'

// Self-hosted WASM (copied to public/wasm from node_modules so the JS/WASM versions match).
const WASM_PATH = '/wasm'
const POSE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const HAND_MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

type VisionFileset = Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>

export interface VisionLandmarker {
  detectForVideo: (video: HTMLVideoElement, timestampMs: number) => { landmarks?: unknown[][] }
}

let fileset: VisionFileset | null = null
let poseLandmarker: PoseLandmarker | null = null
let handLandmarker: HandLandmarker | null = null

async function getFileset(): Promise<VisionFileset> {
  if (!fileset) fileset = await FilesetResolver.forVisionTasks(WASM_PATH)
  return fileset
}

export async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (poseLandmarker) return poseLandmarker
  const fs = await getFileset()
  poseLandmarker = await createPoseLandmarker(fs, 'GPU').catch(async (error) => {
    console.warn('[vision] GPU pose model failed; retrying on CPU:', error)
    return createPoseLandmarker(fs, 'CPU')
  })
  return poseLandmarker
}

export async function getHandLandmarker(): Promise<HandLandmarker> {
  if (handLandmarker) return handLandmarker
  const fs = await getFileset()
  handLandmarker = await createHandLandmarker(fs, 'GPU').catch(async (error) => {
    console.warn('[vision] GPU hand model failed; retrying on CPU:', error)
    return createHandLandmarker(fs, 'CPU')
  })
  return handLandmarker
}

function createPoseLandmarker(fs: VisionFileset, delegate: 'GPU' | 'CPU'): Promise<PoseLandmarker> {
  return PoseLandmarker.createFromOptions(fs, {
    baseOptions: { modelAssetPath: POSE_MODEL, delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
  })
}

function createHandLandmarker(fs: VisionFileset, delegate: 'GPU' | 'CPU'): Promise<HandLandmarker> {
  return HandLandmarker.createFromOptions(fs, {
    baseOptions: { modelAssetPath: HAND_MODEL, delegate },
    runningMode: 'VIDEO',
    numHands: 1,
  })
}

export async function getLandmarkerFor(exercise: ExerciseType): Promise<VisionLandmarker> {
  return exercise === 'custom_gesture' ? await getHandLandmarker() : await getPoseLandmarker()
}

export async function detectPose(
  video: HTMLVideoElement,
  nowMs: number,
): Promise<Landmark[] | null> {
  const landmarker = await getPoseLandmarker()
  const result = landmarker.detectForVideo(video, nowMs)
  return result.landmarks[0] ?? null
}

export async function detectHand(
  video: HTMLVideoElement,
  nowMs: number,
): Promise<Landmark[] | null> {
  const landmarker = await getHandLandmarker()
  const result = landmarker.detectForVideo(video, nowMs)
  return result.landmarks[0] ?? null
}

export function closeVision(): void {
  try {
    poseLandmarker?.close()
    handLandmarker?.close()
  } catch (error) {
    console.error('[vision] close failed:', error)
  }
  poseLandmarker = null
  handLandmarker = null
}
