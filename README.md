# Workout Commitment

A mobile-first prototype for a private daily workout commitment. You choose the movements, the
daily amount and the number of days. One session is required per day. Complete a day and that
day's allocation is returned; miss it and only that day's allocation is lost. Future allocations
stay locked.

**This is a demo. No real money moves.** There is no payment provider, no payout, no AI
verification and no upload. The plan, ledger and capture summaries live in this browser's
`localStorage`.

## What works

- Editable setup: exercises, sets, reps, daily amount and duration. Defaults are ₹1,000/day for
  10 days (₹10,000 total), but every value can be changed.
- Dashboard with one coffin-shaped card per daily allocation, live totals and the current open
  day.
- Live in-app camera preview in a "haunted mirror", video-only recording with `getUserMedia` and
  `MediaRecorder`, review, download and a saved capture summary.
- Honest camera states: permission denied, missing device, unsupported browser, busy camera,
  insecure context, recorder failure and interrupted takes are handled separately.
- Results screen that keeps recording, verification and settlement as three distinct records.
- Demo controls in the ledger to preview returned or lost days, one day at a time.
- Local persistence across refreshes, cross-tab sync, reset-demo, reduced-motion support and
  keyboard/screen-reader labels.

## What is deliberately not built

- Real deposits, withdrawals, custody, KYC, refunds or payment webhooks.
- A completion-verification method. A recording is not proof.
- Calendar cutoffs, timezones or grace periods.
- Interrupted-session policy.
- A destination for forfeited money.
- Accounts, social features, sharing, viewers, voting or leaderboards.

The ledger UI lists these open rules so they are not mistaken for implemented behavior.

## Run

```bash
npm install
npm run dev
```

The dev server uses `dotenv -e .env -- vite dev`. Copy `.env.example` to `.env` if the file is
missing. `DATABASE_URL` is currently unused by the prototype; no database query, migration or
auth flow runs.

Camera capture requires `localhost` or HTTPS.

## Flow

1. `/setup` — set the stake and movements, then seal the demo commitment.
2. `/dashboard` — see the open day, the required session and every daily allocation.
3. `/record` — open the mirror, record one take, review it, optionally download it, then keep a
   capture summary.
4. `/history` — inspect recording, verification and settlement per day; preview outcomes with the
   explicit demo controls; reset the demo when finished.

## Data and recording behavior

- `workout-commitment:demo:v1` in `localStorage` stores the plan, ledger and capture summaries.
- A capture summary stores status, time and duration only. The video blob stays in memory for the
  current tab and is revoked when the recording screen unmounts.
- No video is uploaded. Leaving or reloading `/record` discards the take.
- If storage is unavailable or malformed, the app says so and keeps working in memory.
- Settlement is sequential and each day can settle once. Future days cannot be settled.

## Project layout

```
src/
  components/          app shell, coffin cards, setup and ledger pieces
  components/ui/       small shared primitives
  hooks/               camera preview and MediaRecorder lifecycle
  lib/commitment.ts    pure plan, ledger, capture and coherence rules
  lib/commitment-store.tsx  React context and localStorage persistence
  routes/              TanStack Router file routes
  styles.css           Tailwind v4 theme, horror surfaces and motion
```

## Scripts

```bash
npm run dev              # dev server
npm run generate-routes  # regenerate the route tree
npm run lint             # ESLint
npm run check            # Prettier check
npm test                 # Vitest ledger invariant tests
npx tsc --noEmit         # typecheck
```

Database scripts (`db:generate`, `db:migrate`, `db:studio`) remain from the starter but are not
part of the prototype. Ask before running a migration.
