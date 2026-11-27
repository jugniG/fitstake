# HANDOFF - Habit-Stakes

> Read this first. It is the single source of truth for what this product is, what's built, what's
> left, and the corrections you must NOT undo. The full spec lives in `.kiro/specs/habit-stakes/`
> (`requirements.md` - locked, `design.md`, `tasks.md`).

## TL;DR

Habit-Stakes is a real-money habit-accountability app for the Kiroween Frankenstein track. A user
locks a commitment pot upfront via Kelviq, completes daily camera-verified workouts to win each
day's stake into a "won-back" balance, and receives **one** refund of the won-back total at the end.
Forfeited days' stakes are lost (loss aversion). Built by stitching the Kiro-InteractionKit
gesture/pose approach (MediaPipe) into this TanStack Start app, with Kelviq as merchant of record.

**Current state:** all code is written; `npx tsc --noEmit` is clean and `npm test` is green (33 tests).
The app has **not** been run end-to-end (dev server never started - see AGENTS.md rule) and the DB
has **not** been migrated. Manual setup (Neon, Kelviq dashboard, Google OAuth, env) is pending.

## Product & goals

- User chooses: exercise type (squat / push-up / jumping-jack / custom hand gesture), target reps,
  target sets, daily stake (USD, whole dollars - no cents), total days (any duration).
- `totalCommitment = totalDays × dailyStake`, charged once upfront via Kelviq.
- Per-day lifecycle: `PENDING → COMPLETED | FORFEITED` on the **user's local calendar day**
  (pinned IANA timezone). Completing a day moves `dailyStake` into `wonBackBalance`; missing the
  local-midnight deadline moves it into `forfeitedBalance`.
- Single settlement: after the final day, one `client.refunds.create` of `wonBackBalance` (or none
  if 0). A challenge is refunded **at most once** (DB-level atomic lock + unique refund id).
- Dashboard shows `totalCommitment`, `wonBackBalance` (safe to refund), `forfeitedBalance`,
  remaining days, per-day status.

## Critical corrections to the original brief (do not assume the brief is accurate)

The kickoff prompt contained several inaccuracies; these are the real, verified facts:

1. **Kiro-InteractionKit is a separate _Python_/OpenCV desktop repo.** We did NOT run a Python
   sidecar (it can't run on Vercel serverless). We ported its gesture/pose _pattern_ + the `.kiro`
   DX into the browser stack using `@mediapipe/tasks-vision` (same MediaPipe model family).
2. **Kelviq** - verified against `docs.kelviq.com`:
   - A checkout session **requires** `planIdentifier` + `chargePeriod` (we use `'ONE_TIME'`) plus
     `customAmount` (major units, dollars) + `currencyCode` + `taxBehavior`. A product + one-time
     plan must exist in the Kelviq dashboard → env `KELVIQ_COMMITMENT_PLAN_IDENTIFIER`.
   - Correlation channel is **`metadata`** (`{ challengeId, userId }`), which round-trips on
     `checkout.completed`. `custom_fields_data` is a _different_ field for customer-entered
     checkout form answers - we do NOT use it.
   - Real webhook events: `checkout.completed`, `order.created`, `order.updated`, `order.refunded`,
     `refund.created`, `refund.updated`. There is **no** `order.completed` (the brief was wrong).
     Activate on `checkout.completed`; record settlement on `refund.updated` with
     `status: 'SUCCEEDED'` (NOT on `order.refunded`, which only signals partial vs full).
   - `validateEvent(rawBody, headers, secret)` - **argument order is body, headers, secret.**
   - Refund: `client.refunds.create({ orderId, amountUnits, reason })` in **minor units (cents)**.
   - **No documented hard refund window** - the brief's "must refund by Day 29 / 30-day window" is
     not a Kelviq rule. Single end-of-challenge settlement works for any duration.
3. **Better Auth** - the `better-auth` package was **not** installed in the repo originally (only the
   Drizzle `user/session/account/verification` tables existed from the SaaS template). We installed
   and wired it. Methods: **Google OAuth + email magic-link, no password.** The DodoPayments
   `subscription` + `todo` tables were removed as template cruft.
4. **Deadline = local calendar day in the user's pinned timezone** (multi-country). At activation
   the user picks **Today/Tomorrow** (Tomorrow preselected after 20:00 local). Server-authoritative:
   all status/transition checks use server UTC + stored tz, never the client clock. DST is handled by
   deriving each day's boundaries from its own local date (not by adding 24h).
5. **One active/pending challenge per user** - enforced. Needed because Kelviq orders don't carry our
   `challengeId`, so we link order → challenge by Kelviq `customer_id` + the one-challenge rule.
6. **Client-side computer vision** - MediaPipe runs in the browser (CV can't run on Vercel
   serverless). The client only _proposes_ a completion; the server validates ownership, the open
   window (server time), and a plausible session duration. This is an accepted, documented
   trade-off, not full server-side CV.

## Stack

TanStack Start (React 19 + Vite + Nitro) · TanStack Router (file-based) · Tailwind v4 · Better Auth ·
Kelviq (`@kelviq/node-sdk`) · `@mediapipe/tasks-vision` (WASM self-hosted in `public/wasm`) ·
Drizzle ORM + Postgres (Neon) · Vercel serverless + Vercel Cron. Package manager: npm. Import alias
`#/* → ./src/*`.

## File map (what's built)

```
src/
  db.server.ts                 Neon-SSL-aware pool + schema-typed drizzle factory (HMR-safe)
  db/schema.ts                 Better Auth core tables + challenge/day/workout_verification/kelviq_event
  lib/
    env.ts                     server-only env access (never import from client)
    email.ts                   Resend magic-link delivery (logs link if no transport)
    auth.server.ts             betterAuth instance (drizzleAdapter, Google, magicLink, tanstackStartCookies)
    auth-client.ts             createAuthClient + signInWithGoogle/sendMagicLinkEmail/signOut/useSession
    auth.functions.ts          getSession / ensureSession server fns
    challenge/                 PURE, unit-tested: types, math, windows(TZ/DST), state, settlement + index
    vision/                    engine (MediaPipe), geometry, rep-counter, exercises/{squat,push-up,
                               jumping-jack,custom-gesture}, liveness, index - pure parts unit-tested
    kelviq/                    client.ts, checkout.ts (one-time session), refund.ts (create/retrieve)
    server/                    challenges.ts (createChallenge/getDashboard/completeDay), webhook-handler.ts,
                               settle.ts (settlePendingChallenges)
  routes/
    __root.tsx, index.tsx, login.tsx
    _protected.tsx + _protected/{dashboard,record,setup,history}.tsx
    api/auth/$.ts              Better Auth handler
    api/webhooks/kelviq.ts     raw-body + validateEvent
  components/
    app-shell.tsx              nav + sign-out
    ui/button.tsx              (kept from template)
    challenge/                 setup-form, dashboard-view, money-summary, day-list
    record/rep-recorder.tsx    live camera + MediaPipe rep counting
  format.ts                    formatUSD (USD), formatClock, formatDate...
public/wasm/                   @mediapipe/tasks-vision WASM (self-hosted, version-matched)
drizzle/0000_greedy_nomad.sql  generated migration (not yet applied)
.kiro/
  specs/habit-stakes/          requirements.md, design.md, tasks.md
  steering/                    architecture, vision-conventions, kelviq, testing (inclusion: auto)
  hooks/vision-test-on-save.json  PostFileSave → npm test -- vision
vercel.json                    deployment configuration
```

Removed: the entire old "Workout Commitment" demo - `src/lib/commitment.ts`, `commitment-store.tsx`,
`commitment.test.ts`, and demo components (`coffin-card`, `exercise-list`, `money-summary`,
`plan-gate`, `reset-demo`, `setup/*`, `history/*`) and the old flat routes. `use-camera-recorder.ts`
is now unused (optional cleanup).

## Progress

**Done:** schema + migration generated; pure domain modules + tests; Better Auth wiring; Kelviq
checkout/webhook/refund + server functions + cron; MediaPipe vision engine + rep modules + tests;
all UI routes + components; env example; README; spec (requirements/design/tasks); steering docs;
vision test-on-save hook; route tree regenerated.

**Verified:** `npx tsc --noEmit` clean; `npm test` → 33 passed (7 files: challenge math/windows/state/settlement, vision geometry/rep-counter/liveness).

**Not done / pending:**

- `npm run lint` and `npm run check` (Prettier) were **not** run - run them; fix with `npm run format` if needed.
- DB **not migrated** - user must run `npm run db:migrate` against Neon.
- **Runtime never verified** - dev server was never started (AGENTS.md rule). End-to-end flows
  (auth sign-up, Kelviq checkout → webhook → activation, camera rep counting, settlement cron)
  are unverified. Run `npm run dev` and exercise them.
- Manual setup (below) is the user's responsibility.

## Manual setup (the user must do - you can't)

1. Copy `.env.example` → `.env` and fill: `DATABASE_URL` (Neon, `?sslmode=require`),
   `BETTER_AUTH_SECRET`, `APP_URL`, `GOOGLE_CLIENT_ID/SECRET`, `RESEND_API_KEY/RESEND_FROM`
   (blank = log link server-side in dev), `KELVIQ_SERVER_API_KEY`, `KELVIQ_WEBHOOK_SECRET`,
   `KELVIQ_ENV=sandbox`, `KELVIQ_COMMITMENT_PLAN_IDENTIFIER`.
2. Neon DB + `npm run db:migrate`.
3. Kelviq dashboard: product + one-time plan (its id → `KELVIQ_COMMITMENT_PLAN_IDENTIFIER`);
   webhook endpoint → `<APP_URL>/api/webhooks/kelviq` (signing secret → `KELVIQ_WEBHOOK_SECRET`).
4. Google Cloud: OAuth client; authorized redirect `<APP_URL>/api/auth/callback/google`.

## Verification commands

```bash
npm test                 # vitest - 33 domain + vision tests
npx tsc --noEmit         # typecheck (currently clean)
npm run lint             # ESLint (run this - not yet checked)
npm run check            # Prettier check (run this - not yet checked)
npm run generate-routes  # after adding/renaming routes
# npm run dev            # run manually to test end-to-end (don't leave it to an agent)
```

## Known gotchas

- **AGENTS.md is partly stale.** It still describes the old demo. Its conventions (routing, forms,
  error handling, naming, a11y, never edit `routeTree.gen.ts`, run `generate-routes`, don't run the
  dev server, ask before migrations) **still apply**. But rule #9 ("Do not add automatic forfeiture,
  self-declared payouts or real payment code to the demo") is **superseded** - this product
  deliberately does automatic forfeiture + real Kelviq payments.
- **TanStack server-fn client calls use `{ data: {...} }`** - e.g. `createChallenge({ data: {...} })`,
  `completeDay({ data: {...} })`. `getDashboard()` takes no args.
- **date-fns-tz v3** renamed `zonedTimeToUtc` → `fromZonedTime` (used in `windows.ts`).
- **`db.query.<table>`** only types correctly because `db.server.ts` uses a schema-typed factory
  (`createDb`) for the HMR global - don't "simplify" it back to an untyped global or relational
  queries lose their types.
- **MediaPipe `createFromOptions` is async** (returns a Promise) - it's awaited in `engine.ts`.
- **`validateEvent` argument order:** `(body, headers, secret)` - getting this wrong 400s every webhook.
- **Client CV trust:** the rep count is client-side; do not weaken the server-side guards
  (window/ownership/duration) in `completeDay` or the liveness/min-duration guards in `vision/`.
- Better Auth runtime is **unverified** - confirm sign-up (Google + magic-link) actually creates a
  session and that the drizzle adapter writes to the existing tables. If Better Auth expects a
  different column set, adjust the schema + regenerate the migration.

## Suggested next steps for the second agent

1. Run `npm run lint` and `npm run check`; fix formatting (`npm run format`). Re-run `npx tsc --noEmit`
   and `npm test` to confirm still green.
2. Once the user has env + Neon ready, run `npm run db:migrate`, then `npm run dev` and walk through:
   Google/magic-link sign-in → setup → (sandbox) Kelviq checkout → webhook activation → record a
   day → let the final day lapse / complete → settlement sweep.
3. Use the Kelviq sandbox webhook "Resend" to test idempotency (duplicate `eventId` must not double-activate or double-refund).
4. Drive the settlement with a fake clock if needed to avoid waiting real days: the cron reads
   `new Date()`; for testing you can call `settlePendingChallenges(now)` directly with a future date.

## Out of scope (by requirements)

Fitbit/wearables · calorie/nutrition tracking · Solana/blockchain · per-day refund payouts · Python
sidecar · recurring subscriptions · social/leaderboards · recovering forfeited stakes ·
user-calibrated free-form movements (every exercise uses an authored MediaPipe rep module).
