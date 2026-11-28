import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { AppAccessReason } from '#/lib/access'
import * as server from './access.server'

export type AccessPlan = 'weekly' | 'lifetime'

export type CurrentPlan = 'weekly' | 'lifetime_trial' | 'lifetime' | null

export type AppAccess = {
  hasAccess: boolean
  reason: AppAccessReason
  plan: CurrentPlan
  trialAvailable: boolean
  trialEndsAt: string | null
  endsAt: string | null
  // The $9.99 charge at the end of a lifetime trial was declined.
  lifetimeChargeFailed: boolean
  // A weekly checkout failed in the last few minutes (e.g. card declined), so the paywall can
  // stop waiting and say so.
  recentCheckoutFailed: boolean
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
