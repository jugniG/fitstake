import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import * as server from './experiments.server'

const setupConfigSchema = z.object({ isLateNight: z.boolean() })

// Flag values for the setup screens. Records the exposures for both experiments, so call it
// where the setup form is actually shown.
export const getSetupConfig = createServerFn({ method: 'POST' })
  .validator((data: { isLateNight: boolean }) => setupConfigSchema.parse(data))
  .handler(async ({ data }) => {
    return server.getSetupConfigImpl(data.isLateNight)
  })

export const trackSetupCompleted = createServerFn({ method: 'POST' }).handler(async () => {
  return server.trackSetupCompletedImpl()
})
