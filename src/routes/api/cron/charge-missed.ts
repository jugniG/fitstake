import { timingSafeEqual } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { env } from '#/lib/env'
import { chargeAllDueChallenges } from '#/lib/server/stake-charges.server'
import { chargeAllDueLifetimeTrials } from '#/lib/server/lifetime-trial.server'

function isAuthorized(request: Request): boolean {
  if (!env.CRON_SECRET) return false
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`)
  const received = Buffer.from(request.headers.get('authorization') ?? '')
  return expected.length === received.length && timingSafeEqual(expected, received)
}

// Daily backstop (vercel.json): charges missed days for users who stopped opening the app.
// Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
export const Route = createFileRoute('/api/cron/charge-missed')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        if (!isAuthorized(request)) return new Response('Unauthorized', { status: 401 })
        try {
          const now = new Date()
          const stakes = await chargeAllDueChallenges(now)
          const lifetimeTrials = await chargeAllDueLifetimeTrials(now)
          const hasErrors = stakes.errors.length > 0 || lifetimeTrials.errors.length > 0
          return Response.json({ stakes, lifetimeTrials }, { status: hasErrors ? 207 : 200 })
        } catch (error) {
          console.error('[cron] charge-missed run failed:', error)
          return new Response('Charge run failed', { status: 500 })
        }
      },
    },
  },
})
