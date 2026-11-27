import { createFileRoute } from '@tanstack/react-router'
import { dodo } from '#/lib/dodo/client'
import { env } from '#/lib/env'
import { handleDodoEvent } from '#/lib/server/webhook-handler'
import type { DodoWebhookEvent } from '#/lib/server/webhook-handler'

export const Route = createFileRoute('/api/webhooks/dodo')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (!env.DODO_WEBHOOK_SECRET) {
          console.error('[webhook] DODO_WEBHOOK_SECRET is not set; rejecting delivery')
          return new Response('Webhook secret not configured', { status: 500 })
        }

        // Signature verification needs the exact raw body, so read text before parsing.
        const raw = await request.text()
        const headers = Object.fromEntries(request.headers.entries())

        let event: DodoWebhookEvent
        try {
          event = dodo.webhooks.unwrap(raw, { headers }) as unknown as DodoWebhookEvent
        } catch (error) {
          console.error('[webhook] signature verification failed:', (error as Error).message)
          return new Response('Invalid signature', { status: 401 })
        }

        const webhookId = headers['webhook-id'] ?? ''
        try {
          const result = await handleDodoEvent(event, webhookId)
          if (result === 'duplicate')
            console.info('[webhook] duplicate delivery ignored:', webhookId)
          return new Response('ok', { status: 200 })
        } catch (error) {
          // 500 makes Dodo retry; the event row rolled back with the failed side effects.
          console.error(`[webhook] handler failed for ${event.type}:`, error)
          return new Response('Webhook handler failed', { status: 500 })
        }
      },
    },
  },
})
