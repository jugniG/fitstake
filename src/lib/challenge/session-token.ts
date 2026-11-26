import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

export const WORKOUT_SESSION_MAX_MS = 4 * 60 * 60 * 1000

export type WorkoutSessionPayload = {
  v: 1
  userId: string
  challengeId: string
  dayNumber: number
  startedAtMs: number
  expiresAtMs: number
  nonce: string
}

export type CreateWorkoutSessionInput = {
  userId: string
  challengeId: string
  dayNumber: number
  startedAtMs: number
  maxDurationMs?: number
}

function signBody(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url')
}

export function createWorkoutSessionToken(
  input: CreateWorkoutSessionInput,
  secret: string,
): string {
  if (!secret) throw new Error('A signing secret is required for workout sessions.')
  if (!Number.isInteger(input.dayNumber) || input.dayNumber < 1) {
    throw new Error('A positive day number is required for workout sessions.')
  }

  const maxDurationMs = input.maxDurationMs ?? WORKOUT_SESSION_MAX_MS
  const payload: WorkoutSessionPayload = {
    v: 1,
    userId: input.userId,
    challengeId: input.challengeId,
    dayNumber: input.dayNumber,
    startedAtMs: input.startedAtMs,
    expiresAtMs: input.startedAtMs + maxDurationMs,
    nonce: randomUUID(),
  }
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${body}.${signBody(body, secret)}`
}

export function verifyWorkoutSessionToken(
  token: string,
  secret: string,
  nowMs = Date.now(),
): WorkoutSessionPayload | null {
  if (!secret || !token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, signature] = parts
  if (!body || !signature) return null

  const expected = signBody(body, secret)
  const providedBuffer = Buffer.from(signature, 'utf8')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  if (providedBuffer.length !== expectedBuffer.length) return null
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) return null

  let payload: unknown
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (!isWorkoutSessionPayload(payload)) return null
  if (nowMs < payload.startedAtMs) return null
  if (nowMs > payload.expiresAtMs) return null
  return payload
}

function isWorkoutSessionPayload(value: unknown): value is WorkoutSessionPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Record<string, unknown>
  return (
    payload.v === 1 &&
    typeof payload.userId === 'string' &&
    payload.userId.length > 0 &&
    typeof payload.challengeId === 'string' &&
    payload.challengeId.length > 0 &&
    typeof payload.dayNumber === 'number' &&
    Number.isInteger(payload.dayNumber) &&
    payload.dayNumber > 0 &&
    typeof payload.startedAtMs === 'number' &&
    Number.isFinite(payload.startedAtMs) &&
    typeof payload.expiresAtMs === 'number' &&
    Number.isFinite(payload.expiresAtMs) &&
    payload.expiresAtMs > payload.startedAtMs &&
    typeof payload.nonce === 'string' &&
    payload.nonce.length > 0
  )
}
