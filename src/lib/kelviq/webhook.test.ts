import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { KelviqWebhookError, verifyKelviqWebhook } from './webhook'

const SECRET = 'kq_whsec_wf5ddy1y39vfst15'

function signPayload(body: string, id: string, timestamp: string, secret = SECRET): string {
  const stripped = secret.replace(/^kq_whsec_|^whsec_/, '')
  const keyBytes = Buffer.from(stripped, 'base64')
  const payload = `${id}.${timestamp}.${body}`
  return `v1,${createHmac('sha256', keyBytes).update(payload, 'utf8').digest('base64')}`
}

describe('verifyKelviqWebhook', () => {
  const id = 'evt_test_123'
  const now = Math.floor(Date.now() / 1000).toString()
  const rawBody = JSON.stringify({
    type: 'checkout.completed',
    data: { object: { id: 'order_1' } },
  })

  it('verifies a valid Kelviq webhook with base64 signature per spec', () => {
    const signature = signPayload(rawBody, id, now)
    const headers = {
      'webhook-id': id,
      'webhook-timestamp': now,
      'webhook-signature': signature,
    }

    const event = verifyKelviqWebhook(rawBody, headers, SECRET)
    expect(event.type).toBe('checkout.completed')
  })

  it('verifies when multiple space-separated signatures exist in header', () => {
    const signature = signPayload(rawBody, id, now)
    const dummySignature = 'v1,someOldRotatedSignatureBase64='
    const headers = {
      'webhook-id': id,
      'webhook-timestamp': now,
      'webhook-signature': `${dummySignature} ${signature}`,
    }

    const event = verifyKelviqWebhook(rawBody, headers, SECRET)
    expect(event.type).toBe('checkout.completed')
  })

  it('verifies when multiple candidate secrets are provided', () => {
    const signature = signPayload(rawBody, id, now)
    const headers = {
      'webhook-id': id,
      'webhook-timestamp': now,
      'webhook-signature': signature,
    }

    const event = verifyKelviqWebhook(rawBody, headers, ['wrong_secret', SECRET])
    expect(event.type).toBe('checkout.completed')
  })

  it('rejects on missing headers', () => {
    expect(() => verifyKelviqWebhook(rawBody, {}, SECRET)).toThrow(KelviqWebhookError)
  })

  it('rejects on timestamp older than tolerance window', () => {
    const oldTimestamp = (Math.floor(Date.now() / 1000) - 400).toString()
    const signature = signPayload(rawBody, id, oldTimestamp)
    const headers = {
      'webhook-id': id,
      'webhook-timestamp': oldTimestamp,
      'webhook-signature': signature,
    }

    expect(() => verifyKelviqWebhook(rawBody, headers, SECRET, { toleranceSeconds: 300 })).toThrow(
      /tolerance/,
    )
  })

  it('rejects on tampered body', () => {
    const signature = signPayload(rawBody, id, now)
    const headers = {
      'webhook-id': id,
      'webhook-timestamp': now,
      'webhook-signature': signature,
    }

    const tampered = rawBody.replace('order_1', 'order_2')
    expect(() => verifyKelviqWebhook(tampered, headers, SECRET)).toThrow(/verification failed/)
  })

  it('rejects on invalid signature', () => {
    const headers = {
      'webhook-id': id,
      'webhook-timestamp': now,
      'webhook-signature': 'v1,invalidBase64Signature=',
    }

    expect(() => verifyKelviqWebhook(rawBody, headers, SECRET)).toThrow(/verification failed/)
  })
})
