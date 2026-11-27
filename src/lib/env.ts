// Server-only environment access. Never import this from a client module.
const dodoMode: 'test_mode' | 'live_mode' =
  process.env.DODO_MODE === 'live_mode' ? 'live_mode' : 'test_mode'

export const env = {
  APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? '',
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
  RESEND_FROM: process.env.RESEND_FROM ?? '',
  DODO_MODE: dodoMode,
  DODO_API_KEY: process.env.DODO_API_KEY ?? '',
  DODO_WEBHOOK_SECRET: process.env.DODO_WEBHOOK_SECRET ?? '',
  DODO_WEEKLY_PRODUCT_ID: process.env.DODO_WEEKLY_PRODUCT_ID ?? '',
  DODO_LIFETIME_PRODUCT_ID: process.env.DODO_LIFETIME_PRODUCT_ID ?? '',
  DODO_STAKE_PRODUCT_ID: process.env.DODO_STAKE_PRODUCT_ID ?? '',
  DODO_LIFETIME_TRIAL_PRODUCT_ID: process.env.DODO_LIFETIME_TRIAL_PRODUCT_ID ?? '',
  CRON_SECRET: process.env.CRON_SECRET ?? '',
  // Server-side environment key (ser.…). Without it every flag uses its fallback value.
  FLAGSMITH_ENVIRONMENT_KEY: process.env.FLAGSMITH_ENVIRONMENT_KEY ?? '',
  DATABASE_URL: process.env.DATABASE_URL ?? '',
}
