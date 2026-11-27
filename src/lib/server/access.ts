import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { AppAccessReason } from '#/lib/access'
import * as server from './access.server'

export type AccessPlan = 'weekly' | 'lifetime'

export type AppAccess = {
  hasAccess: boolean
  reason: AppAccessReason
  trialAvailable: boolean
  trialEndsAt: string | null
  endsAt: string | null
}

const startAccessCheckoutSchema = z.object({ plan: z.enum(['weekly', 'lifetime']) })

export const getAppAccess = createServerFn({ method: 'GET' }).handler(async () => {
  return server.getAppAccessImpl()
})

export const startAccessCheckout = createServerFn({ method: 'POST' })
  .validator((data: { plan: AccessPlan }) => startAccessCheckoutSchema.parse(data))
  .handler(async ({ data }) => {
    return server.startAccessCheckoutImpl(data.plan)
  })
