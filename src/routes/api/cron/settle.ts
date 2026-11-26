import { createFileRoute } from '@tanstack/react-router'
import { env } from '#/lib/env'
import { settlePendingChallenges } from '#/lib/server/settle'

async function runSettle(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization')
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  try {
    const result = await settlePendingChallenges(new Date())
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (error) {
    console.error('[cron-settle] sweep failed:', error)
    return new Response('Settlement sweep failed', { status: 500 })
  }
}

export const Route = createFileRoute('/api/cron/settle')({
  server: {
    handlers: {
      // Vercel Cron sends GET by default with Authorization: Bearer <CRON_SECRET>.
      GET: async ({ request }: { request: Request }) => runSettle(request),
      POST: async ({ request }: { request: Request }) => runSettle(request),
    },
  },
})
