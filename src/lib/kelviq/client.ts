import { Kelviq, environmentFromEnv } from '@kelviq/node-sdk'
import { env } from '../env'

// Server-only. The Server API Key is read from env; never import this from a client module.
export const kelviq = new Kelviq({
  accessToken: env.KELVIQ_SERVER_API_KEY,
  environment: environmentFromEnv(),
})
