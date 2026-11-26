import { createHash } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { validateEvent, WebhookVerificationError } from '@kelviq/node-sdk'
import { env } from '#/lib/env'
import { handleKelviqEvent } from '#/lib/server/webhook-handler'
import type { KelviqEvent } from '#/lib/server/webhook-handler'

export const Route = createFileRoute('/api/webhooks/kelviq')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const raw = await request.text()
        const headers = Object.fromEntries(request.headers.entries()) as Record<string, string>

        let event: KelviqEvent
        try {
          event = validateEvent(raw, headers, env.KELVIQ_WEBHOOK_SECRET) as unknown as KelviqEvent
        } catch (error) {
          if (error instanceof WebhookVerificationError) {
            console.error('[kelviq-webhook] signature verification failed')
          } else {
            console.error('[kelviq-webhook] verify failed:', error)
          }
          return new Response('Invalid signature', { status: 400 })
        }

        const eventId = resolveEventId(event, raw, headers)
        try {
          const result = await handleKelviqEvent(event, eventId)
          if (result === 'duplicate') {
            console.info('[kelviq-webhook] duplicate event ignored:', eventId)
          }
          return new Response('ok', { status: 202 })
        } catch (error) {
          console.error('[kelviq-webhook] handler failed:', error)
          return new Response('Webhook handler failed', { status: 500 })
        }
      },
    },
  },
})

function resolveEventId(event: KelviqEvent, raw: string, headers: Record<string, string>): string {
  if (event.id) return event.id
  for (const name of ['webhook-id', 'x-webhook-id', 'x-kelviq-event-id']) {
    const value = headers[name]
    if (value) return value
  }
  // Kelviq retries the same signed body. Hashing it keeps idempotency working even if the
  // provider omits an explicit event id.
  return `sha256:${createHash('sha256').update(raw).digest('hex')}`
}
