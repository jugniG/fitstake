# StakeFit (Habit-Stakes)

Do your workout on camera every day. Miss a day and your card is charged that day's stake.

Choose your exercises, a daily stake (USD) and how many days. You authorize your card once through
[Dodo Payments](https://dodopayments.com) (merchant of record); nothing is charged upfront. Each
day you complete your sets and reps on the live camera costs nothing. Each day you miss is charged
your stake the next time you open the app, or by a daily background job. A day is charged at most
once, and a challenge never costs more than days × stake.

App access is a separate plan: **$2/week with a 3-day free trial**, or **$49 once for lifetime**.

## Stack

- **Framework:** TanStack Start (React 19 + Vite + Nitro), TanStack Router, Tailwind v4
- **Auth:** Better Auth - Google OAuth + email magic-link (no password)
- **Payments:** Dodo Payments (`dodopayments`) - hosted checkouts, on-demand subscription
  mandates for missed-day charges, Standard Webhooks signatures
- **Vision:** `@mediapipe/tasks-vision` (`PoseLandmarker` / `HandLandmarker`) in the browser; WASM
  self-hosted in `public/wasm`, models load from the MediaPipe CDN
- **DB:** Postgres via Drizzle ORM
- **Hosting:** Vercel serverless + a daily Vercel Cron backstop for missed-day charges

## What's verified vs. trusted

Pose rep-counting runs **client-side** (computer vision can't run on Vercel serverless). The client
proposes a completion; the server validates it: the day must be open (server UTC + the user's pinned
timezone), the reps and sets must match the target, and the session duration must be plausible.
Live camera only, with liveness (frame-continuity), minimum rep duration and landmark confidence
guards. This is an accepted trade-off for serverless hosting, not full server-side CV.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` (with `?schema=stakefit`), `BETTER_AUTH_SECRET`, `APP_URL`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
   - `RESEND_API_KEY` / `RESEND_FROM` (leave blank in dev to log the magic-link URL server-side)
   - `DODO_MODE`, `DODO_API_KEY`, `DODO_WEBHOOK_SECRET`, `DODO_WEEKLY_PRODUCT_ID`,
     `DODO_LIFETIME_PRODUCT_ID`, `DODO_STAKE_PRODUCT_ID`, `CRON_SECRET`
3. **Migrate the DB:** `npm run db:migrate` (SQL is generated in `drizzle/`).
4. **Dodo dashboard** (same mode as your key):
   - Products: a $2/week subscription, a $49 one-time product, and a subscription product used
     only for on-demand stake mandates.
   - Webhook endpoint `<APP_URL>/api/webhooks/dodo` subscribed to `subscription.*` and
     `payment.succeeded` / `payment.failed`; copy its signing secret into `DODO_WEBHOOK_SECRET`.
5. MediaPipe WASM is already self-hosted in `public/wasm`; nothing to do.

## Run

```bash
npm run dev           # dev server (run this yourself; do not leave it to the agent)
npm run lint          # ESLint
npm run check         # Prettier check
npm test              # Vitest (domain + vision unit tests)
npx tsc --noEmit      # typecheck
```

Camera capture requires `localhost` or HTTPS.

## Deploy (Vercel)

Add the same env vars to Vercel. `vercel.json` schedules `/api/cron/charge-missed` daily; Vercel
sends `Authorization: Bearer $CRON_SECRET`.

## Project layout

```
src/
  lib/challenge/      pure math, day windows, state machine, missed-day charge rules (unit-tested)
  lib/access.ts       pure plan/access rules (unit-tested)
  lib/vision/         MediaPipe engine, rep-counter, exercises, liveness (unit-tested)
  lib/dodo/           server-only Dodo client, customers, checkouts, charges
  lib/server/         challenges, access, stake charges, webhook handler
  lib/auth*.ts        Better Auth server + client + session server fns
  db/schema.ts        Drizzle schema
  routes/             TanStack file routes incl. /api/auth/$, /api/webhooks/dodo, /api/cron/charge-missed
.kiro/steering/       architecture, dodo, vision-conventions, testing
.kiro/specs/habit-stakes/  requirements, design, tasks
```
