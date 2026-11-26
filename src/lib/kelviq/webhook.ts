import { createHmac, timingSafeEqual } from 'node:crypto'
import type { KelviqEvent } from '#/lib/server/webhook-handler'

export class KelviqWebhookError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KelviqWebhookError'
  }
}

interface VerifyWebhookOptions {
  /** Maximum timestamp drift in seconds (default 300 = 5 minutes). Set to 0 to disable. */
  toleranceSeconds?: number
}

function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

/**
 * Verifies incoming Kelviq webhook signatures using the official Kelviq documentation
 * and Standard Webhooks specification.
 *
 * Header contract:
 * - webhook-id: unique event delivery ID
 * - webhook-timestamp: Unix timestamp (seconds)
 * - webhook-signature: "v1,<base64_or_hex_signature>" (may be space-separated for rotated keys)
 *
 * Secret handling:
 * - Secret starts with "kq_whsec_" or "whsec_"; the remaining string is base64-decoded
 *   to raw HMAC key bytes.
 */
export function verifyKelviqWebhook(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
  secrets: string | string[],
  options: VerifyWebhookOptions = {},
): KelviqEvent {
  const lower: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) {
    if (v != null) {
      lower[k.toLowerCase()] = Array.isArray(v) ? v[0] : v
    }
  }

  const webhookId = lower['webhook-id']
  const timestampStr = lower['webhook-timestamp']
  const signatureHeader = lower['webhook-signature']

  if (!webhookId || !timestampStr || !signatureHeader) {
    throw new KelviqWebhookError(
      `Missing required webhook headers (id=${Boolean(webhookId)}, timestamp=${Boolean(timestampStr)}, signature=${Boolean(signatureHeader)})`,
    )
  }

  const tolerance = options.toleranceSeconds ?? 300
  if (tolerance > 0) {
    const timestamp = parseInt(timestampStr, 10)
    const now = Math.floor(Date.now() / 1000)
    if (Number.isNaN(timestamp) || Math.abs(now - timestamp) > tolerance) {
      throw new KelviqWebhookError(
        `Webhook timestamp outside tolerance window (${timestampStr}, now: ${now})`,
      )
    }
  }

  const signatures = signatureHeader
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith('v1,'))
    .map((s) => s.slice(3))

  if (signatures.length === 0) {
    throw new KelviqWebhookError(
      `Invalid webhook signature header format: "${signatureHeader}". Expected "v1,<sig>"`,
    )
  }

  const signedPayload = `${webhookId}.${timestampStr}.${rawBody}`
  const rawSecretList = Array.isArray(secrets) ? secrets : [secrets]
  const secretList: string[] = []

  for (const item of rawSecretList) {
    if (!item) continue
    for (const part of item.split(/[,;\s]+/)) {
      const trimmed = part.trim()
      if (trimmed && !secretList.includes(trimmed)) {
        secretList.push(trimmed)
      }
    }
  }

  let verified = false

  for (const secret of secretList) {
    const stripped = secret.replace(/^kq_whsec_|^whsec_/, '')
    const keyCandidates: (Buffer | string)[] = []

    try {
      const decoded = Buffer.from(stripped, 'base64')
      if (decoded.length > 0) keyCandidates.push(decoded)
    } catch {
      // not base64
    }
    keyCandidates.push(secret)
    keyCandidates.push(stripped)

    for (const key of keyCandidates) {
      const base64Digest = createHmac('sha256', key).update(signedPayload, 'utf8').digest('base64')
      const hexDigest = createHmac('sha256', key).update(signedPayload, 'utf8').digest('hex')

      for (const expected of signatures) {
        if (safeCompare(base64Digest, expected) || safeCompare(hexDigest, expected)) {
          verified = true
          break
        }
      }
      if (verified) break
    }
    if (verified) break
  }

  if (!verified) {
    throw new KelviqWebhookError('Webhook signature verification failed.')
  }

  try {
    return JSON.parse(rawBody) as KelviqEvent
  } catch (err) {
    throw new KelviqWebhookError(`Failed to parse webhook JSON payload: ${(err as Error).message}`)
  }
}
