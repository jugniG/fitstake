// Server-only environment access. Never import this from a client module.
export const env = {
  APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? '',
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
  RESEND_FROM: process.env.RESEND_FROM ?? '',
  KELVIQ_SERVER_API_KEY: process.env.KELVIQ_SERVER_API_KEY ?? '',
  KELVIQ_WEBHOOK_SECRET: process.env.KELVIQ_WEBHOOK_SECRET ?? '',
  KELVIQ_ENV: process.env.KELVIQ_ENV ?? 'sandbox',
  KELVIQ_COMMITMENT_PLAN_IDENTIFIER: process.env.KELVIQ_COMMITMENT_PLAN_IDENTIFIER ?? '',
  KELVIQ_SUBSCRIPTION_PLAN_IDENTIFIER: process.env.KELVIQ_SUBSCRIPTION_PLAN_IDENTIFIER ?? '',
  KELVIQ_LIFETIME_PLAN_IDENTIFIER: process.env.KELVIQ_LIFETIME_PLAN_IDENTIFIER ?? '',
  DATABASE_URL: process.env.DATABASE_URL ?? '',
}
