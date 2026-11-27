import { ensureSession } from '#/lib/auth.functions'
import { EXPERIMENT_EVENT } from '#/lib/experiments'
import { recordSetupExposures, trackExperimentEvent } from '#/lib/flagsmith.server'
import type { SetupConfig } from '#/lib/flagsmith.server'

export async function getSetupConfigImpl(isLateNight: boolean): Promise<SetupConfig> {
  const session = await ensureSession()
  return recordSetupExposures(session.user.id, isLateNight)
}

export async function trackSetupCompletedImpl(): Promise<{ ok: true }> {
  const session = await ensureSession()
  await trackExperimentEvent(session.user.id, EXPERIMENT_EVENT.setupCompleted)
  return { ok: true }
}
