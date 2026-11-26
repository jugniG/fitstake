import { describe, expect, it } from 'vitest'
import {
  createWorkoutSessionToken,
  verifyWorkoutSessionToken,
  WORKOUT_SESSION_MAX_MS,
} from './session-token'

const SECRET = 'test-secret'
const NOW = Date.parse('2026-11-20T10:00:00Z')
const BASE_INPUT = {
  userId: 'user-1',
  challengeId: 'challenge-1',
  dayNumber: 3,
  startedAtMs: NOW,
}

describe('workout session token', () => {
  it('round-trips a signed session', () => {
    const token = createWorkoutSessionToken(BASE_INPUT, SECRET)
    const payload = verifyWorkoutSessionToken(token, SECRET, NOW + 5_000)
    expect(payload).toMatchObject(BASE_INPUT)
    expect(payload?.expiresAtMs).toBe(NOW + WORKOUT_SESSION_MAX_MS)
  })

  it('rejects a tampered payload', () => {
    const token = createWorkoutSessionToken(BASE_INPUT, SECRET)
    const [body, signature] = token.split('.')
    const tamperedBody = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(body, 'base64url').toString('utf8')),
        dayNumber: 4,
      }),
    ).toString('base64url')
    expect(
      verifyWorkoutSessionToken(`${tamperedBody}.${signature}`, SECRET, NOW + 5_000),
    ).toBeNull()
  })

  it('rejects a token signed with a different secret', () => {
    const token = createWorkoutSessionToken(BASE_INPUT, SECRET)
    expect(verifyWorkoutSessionToken(token, 'other-secret', NOW + 5_000)).toBeNull()
  })

  it('rejects an expired session', () => {
    const token = createWorkoutSessionToken(
      { ...BASE_INPUT, startedAtMs: NOW - 5 * 60 * 60 * 1000 },
      SECRET,
    )
    expect(verifyWorkoutSessionToken(token, SECRET, NOW)).toBeNull()
  })

  it('rejects a token used before it was issued', () => {
    const token = createWorkoutSessionToken(BASE_INPUT, SECRET)
    expect(verifyWorkoutSessionToken(token, SECRET, NOW - 1)).toBeNull()
  })
})
