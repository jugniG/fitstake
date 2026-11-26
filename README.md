# Habit-Stakes

Lock a commitment pot upfront, win each day back with camera-verified workouts, and settle once.

Choose the exercise, your daily stake (USD), and how many days. You pay the full pot once via
[Kelviq](https://kelviq.com) (merchant of record). Each day you complete your target sets and reps
on the live camera, that day's stake moves into your **won-back** balance. Miss a day's local
deadline and that day's stake is **forfeited**. At the end of the challenge, the won-back total is
refunded to your original payment method in a single settlement — no per-day payout churn, and a
challenge is refunded at most once.

Real money, real webhooks, real camera verification. Built for the Kiroween Frankenstein track by
stitching the [Kiro-InteractionKit](https://github.com/Harpita-P/Kiro-InteractionKit) gesture/pose
approach (MediaPipe) into a TanStack Start app, with Kelviq handling payments.

## Stack

- **Framework:** TanStack Start (React 19 + Vite + Nitro), TanStack Router, Tailwind v4
- **Auth:** Better Auth — Google OAuth + email magic-link (no password)
- **Payments:** Kelviq (`@kelviq/node-sdk`) — one-time checkout, HMAC webhooks, partial refund
- **Vision:** `@mediapipe/tasks-vision` (`PoseLandmarker` / `HandLandmarker`) in the browser; WASM
  self-hosted in `public/wasm`, models load from the MediaPipe CDN
- **DB:** Postgres (Neon serverless) via Drizzle ORM
- **Hosting:** Vercel serverless + Vercel Cron for the settlement sweep

## What's verified vs. trusted

Pose rep-counting runs **client-side** (computer vision can't run on Vercel serverless). The client
proposes a completion; the server validates it: the day must be open (server UTC + the user's pinned
timezone), the rep/sets must match the target, and the session duration must be plausible. Live
camera only, with liveness (frame-continuity), minimum rep duration, and landmark confidence
guards. This is an accepted trade-off for serverless hosting — not full server-side CV.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` — a Neon connection string (`...?sslmode=require`)
   - `BETTER_AUTH_SECRET`, `APP_URL`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
   - `RESEND_API_KEY` / `RESEND_FROM` (leave blank in dev to log the magic-link URL server-side)
   - `KELVIQ_SERVER_API_KEY`, `KELVIQ_WEBHOOK_SECRET`, `KELVIQ_ENV=sandbox`,
     `KELVIQ_COMMITMENT_PLAN_IDENTIFIER`
3. **Migrate the DB:** `npm run db:migrate` (migration SQL is generated at `drizzle/`).
4. **Kelviq dashboard:** create a product + a one-time plan (use its identifier for
   `KELVIQ_COMMITMENT_PLAN_IDENTIFIER`), and register a webhook endpoint to
   `<APP_URL>/api/webhooks/kelviq` (copy the signing secret into `KELVIQ_WEBHOOK_SECRET`).
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

- Add the same env vars to Vercel. Settlement runs automatically upon final workout completion and lazily on dashboard load (no cron required).

## Project layout

```
src/
  lib/challenge/      pure plan math, day windows, state machine, settlement (unit-tested)
  lib/vision/          MediaPipe engine, rep-counter, exercises, liveness (unit-tested)
  lib/kelviq/          server-only Kelviq checkout/refund
  lib/server/          createChallenge/getDashboard/completeDay + webhook + settlement sweep
  lib/auth*.ts         Better Auth server + client + session server fns
  db/schema.ts         Drizzle schema (Better Auth tables + challenge/day/verification/event)
  routes/              TanStack file routes incl. /api/auth/$, /api/webhooks/kelviq, /api/cron/settle
.kiro/steering/        architecture, vision-conventions, kelviq, testing
.kiro/specs/habit-stakes/  requirements, design, tasks
```
