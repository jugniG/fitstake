import DodoPayments from 'dodopayments'
import { env } from '../env'

// Server-only. The API key and webhook secret come from env; never import this from a client
// module. `webhookKey` lets `dodo.webhooks.unwrap` verify signatures without passing the secret.
export const dodo = new DodoPayments({
  bearerToken: env.DODO_API_KEY,
  environment: env.DODO_MODE,
  webhookKey: env.DODO_WEBHOOK_SECRET || null,
})

// Fail at the call site with a clear message instead of a 401 from Dodo.
export function assertDodoConfigured(): void {
  if (!env.DODO_API_KEY) throw new Error('DODO_API_KEY is not set')
}
