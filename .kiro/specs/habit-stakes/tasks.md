# Habit-Stakes — Tasks

Source of truth: `requirements.md` (locked) and `design.md`.

## Done

- [x] Env example with all required variables
- [x] Drizzle schema: Better Auth tables kept; dodo `subscription`/`todo` dropped; `challenge`,
      `day`, `workout_verification`, `kelviq_event` added; Neon SSL on the pool
- [x] Pure domain modules + tests: challenge math & invariant, TZ/DST day windows, day/challenge
      state machine, idempotent single-refund settlement
- [x] Better Auth wired (Google + magic-link, no password) on the existing tables; `getSession`/
      `ensureSession` server fns; `/api/auth/$` handler; `_protected` route guard
- [x] Kelviq client, one-time checkout (`metadata` correlation), raw-body webhook with
      `validateEvent` + event-id idempotency, activation, order linking, refund create/retrieve
- [x] Server functions: `createChallenge`, `getDashboard` (lazy forfeiture), `completeDay`
      (window + timing validation); settlement sweep in `/api/cron/settle`
- [x] MediaPipe vision: self-hosted WASM, `PoseLandmarker`/`HandLandmarker` engine, rep-counter
      state machine, squat/push-up/jumping-jack/custom-gesture evaluators, liveness guard, tests
- [x] UI: landing, login, setup form, dashboard, record (live rep counting), history, app shell
- [x] Remove the old "Workout Commitment" demo code
- [x] Vercel cron config; `.kiro/steering` + vision test-on-save hook; migration generated

## Manual setup (you)

- [ ] Create a Neon Postgres DB and set `DATABASE_URL`, then run `npm run db:migrate`
      (SQL already generated at `drizzle/0000_greedy_nomad.sql`)
- [ ] Kelviq: create a product + one-time plan → set `KELVIQ_COMMITMENT_PLAN_IDENTIFIER`; create a
      webhook endpoint to `<APP_URL>/api/webhooks/kelviq` → set `KELVIQ_WEBHOOK_SECRET`; set
      `KELVIQ_SERVER_API_KEY`; keep `KELVIQ_ENV=sandbox` while testing
- [ ] Google OAuth credentials → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- [ ] `BETTER_AUTH_SECRET`, `CRON_SECRET`, `APP_URL`; `RESEND_API_KEY` + `RESEND_FROM` for
      magic-link email (leave blank in dev to log the link server-side)
- [ ] On Vercel: add the same env vars; the cron in `vercel.json` runs hourly

## Not in scope (by requirements)

Fitbit/wearables, calorie/nutrition tracking, Solana/blockchain, per-day refund payouts, Python
sidecar, recurring subscriptions.
