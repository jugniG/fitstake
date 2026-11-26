# Habit-Stakes — Requirements

> Status: LOCKED — open questions resolved. Ready for design.
> Owner: engineering. Currency: USD (whole dollars, no cents). MoR: Kelviq. Hosting: Vercel (serverless).

## 1. Overview

Habit-Stakes is a real-money habit-accountability app. A user locks a commitment pot
upfront via Kelviq, completes daily camera-verified workouts to win each day's stake into a
"Won Back" balance, and receives a **single** refund of the total won-back amount at the end
of the challenge. Forfeited days' stakes are lost — the loss-aversion mechanism. It is built by
stitching the Kiro-InteractionKit gesture/pose approach (MediaPipe) into this TanStack Start app,
with Kelviq as the merchant of record.

This replaces the existing local-only "Workout Commitment" demo (localStorage, manual
settlement, no verification, no payments) with the real product. The TanStack Start + Drizzle
scaffolding is kept; the demo-specific logic and UI are removed.

## 2. Background & decisions already made

- **Kiro-InteractionKit** is a separate Python/OpenCV desktop template. We port its MediaPipe +
  gesture/pose controller pattern and its `.kiro/hooks` + `.kiro/steering` developer experience
  into this browser stack. We do **not** run a Python sidecar (it cannot run on Vercel serverless).
  MediaPipe ships a Web runtime (`@mediapipe/tasks-vision`) using the same models.
- **Kelviq** is the merchant of record. Real API surface (from docs.kelviq.com):
  - Node SDK `@kelviq/node-sdk`; `new Kelviq({ accessToken, environment })`, `environmentFromEnv()`
    reads `KELVIQ_ENV` (defaults to sandbox).
  - Checkout: `client.checkout.createSession({ customAmount, currencyCode, taxBehavior, successUrl, customerId, metadata })`
    → `{ checkoutSessionId, checkoutUrl }`. `customAmount` is major units (e.g. `100.00`).
  - `metadata` round-trips into `checkout.completed` at `data.object.metadata`. (`custom_fields_data`
    is a different field for customer-entered checkout form answers — not used for our IDs.)
  - Webhook events: `checkout.completed`, `order.created`, `order.updated`, `order.refunded`,
    `refund.created`, `refund.updated` (subscription/invoice events not needed).
  - Signature: headers `webhook-id`, `webhook-timestamp`, `webhook-signature` (HMAC-SHA256, `v1,`),
    verified via SDK `validateEvent(rawBody, secret, headers)` on the raw body.
  - Refund: `client.refunds.create({ orderId, amountUnits, reason, internalNote })`. `amountUnits`
    is minor units (cents); bounded by the order's "remaining refundable balance." No documented
    hard refund-by date exists (the "30-day refund window" in the original brief is not a Kelviq
    rule), so the single settlement can run at the natural end of any user-chosen duration.
- **Auth:** Better Auth, using the existing `user`/`session`/`account`/`verification` Drizzle
  tables. The `better-auth` package is not yet installed; it will be added and wired. The
  DodoPayments-template `subscription` and `todo` tables are removed. Auth methods: **Google
  OAuth and email magic-link. No email/password.**
- **Deadline model:** local calendar day in the user's pinned IANA timezone (multi-country).
- **Hosting:** Vercel serverless. Pose verification is client-side (browser WASM); Kelviq calls +
  webhooks via TanStack Start server routes; settlement via Vercel Cron; persistence via Neon
  Postgres + Drizzle.

## 3. Goals

- User-defined challenges: `exerciseType`, `targetReps`, `targetSets`, `dailyStakeAmount` (USD),
  `totalDays` (any duration). `totalCommitment = totalDays × dailyStakeAmount`.
- A real, one-time Kelviq upfront charge of `totalCommitment`.
- Live in-browser pose rep verification per user-chosen exercise, with anti-cheat.
- Per-day lifecycle `PENDING → COMPLETED | FORFEITED` on the user's local calendar.
- A virtual ledger: `wonBackBalance`, `forfeitedBalance`, remaining days, per-day status.
- A single settlement refund of `wonBackBalance` at challenge end — idempotent, at most once.
- Better Auth accounts (Google + magic-link); timezone-aware (multi-country).

## 4. Non-Goals / Out of Scope

- Fitbit/wearable integrations; calorie or nutrition tracking.
- Solana / blockchain / smart contracts.
- Per-day refund payouts (exactly one settlement refund per challenge).
- A Python/OpenCV server sidecar (not Vercel-hostable).
- Recurring subscriptions (one-time charges only).
- Social features, sharing, viewers, voting, leaderboards.
- Recovering or refunding forfeited stakes.
- User-calibrated/free-form movement definition (every supported exercise uses an authored
  MediaPipe rep module; "custom" means choosing a hand-gesture rep cycle, not arbitrary motion).

## 5. Functional Requirements

### FR-1 Challenge configuration
- The user selects `exerciseType` ∈ {squat, push-up, jumping-jack, custom gesture}, `targetReps > 0`,
  `targetSets > 0`, `dailyStakeAmount` (whole USD dollars, no cents), `totalDays ≥ 1`.
- `totalCommitmentAmount = totalDays × dailyStakeAmount`, held in USD minor units (cents) internally.
- The challenge is persisted in a `PENDING_CHARGE` state before checkout, owned by the signed-in user.

### FR-2 Kelviq upfront checkout
- The server creates a one-time Kelviq checkout session: `customAmount = totalCommitment`,
  `currencyCode: "USD"`, `metadata: { challengeId, userId }`, `successUrl`.
- The user is redirected to `checkoutUrl`; on return to `successUrl` the UI shows an
  "activating" state until the webhook confirms.
- The Kelviq Server API Key is never exposed to the client.

### FR-3 Webhooks
- One endpoint receives Kelviq webhooks on the **raw** request body and verifies every delivery
  with `validateEvent` + `KELVIQ_WEBHOOK_SECRET`.
- Idempotent by event `id` (reject duplicates).
- `checkout.completed` → activate the challenge: set `activatedAt` to the verified server time,
  pin the user's IANA timezone, open Day 1, and capture the resulting order id.
- `order.created` / `order.updated` → link the Kelviq order id to the challenge (needed to refund).
- `refund.created` / `refund.updated` / `order.refunded` → record settlement completion (use
  `refund.updated` with `status: SUCCEEDED` as the terminal confirmation; `order.refunded` only
  signals partial vs full, not the amount).

### FR-4 Activation & timezone
- The user's IANA timezone is captured from the browser at setup and **pinned** for the
  challenge's lifetime (so the calendar is consistent even if the user travels).
- `activatedAt` is the server UTC from the verified `checkout.completed` event, never the
  client clock.
- At activation the user explicitly chooses Day-1's start day — **Today** or **Tomorrow**.
  **Today** is preselected normally; **Tomorrow** is preselected (with an explanatory note) when
  activation occurs after 20:00 in the user's local time. Day 1 is then anchored to the chosen
  start day; before that day's local midnight, Day 1 is `LOCKED`.

### FR-5 Day lifecycle (local calendar, server-authoritative)
- Day 1 is the user-chosen start day (Today or Tomorrow at activation); Day *d* is the *d*-th
  consecutive local calendar day from Day 1 in the pinned timezone.
- Day 1 window = `[effective start, local-midnight ending Day 1]`, where the effective start is
  `activatedAt` if Day 1 = Today, or the local midnight beginning Day 1 if Day 1 = Tomorrow.
- Day *d* > 1 window = `[local-midnight start, local-midnight end]` of that local day.
- Statuses: `LOCKED` (future day / before its window), `PENDING` (window open, not yet completed),
  `COMPLETED` (workout verified within the window), `FORFEITED` (window ended without completion).
- All status and transition checks use **server UTC + the stored timezone**, never the client
  clock. `FORFEITED` is derived lazily on read; the dashboard always reflects current status.

### FR-6 Workout verification (in-browser MediaPipe)
- Live camera only (`getUserMedia`); file, upload, and pre-recorded inputs are rejected.
- We author a dedicated MediaPipe rep module for every supported exercise (v1 catalog, extensible):
  - squat → knee/hip-angle state machine (`PoseLandmarker`);
  - push-up → elbow-angle state machine (`PoseLandmarker`);
  - jumping-jack → arm + leg spread state machine (`PoseLandmarker`);
  - custom gesture → a chosen hand-gesture rep cycle (e.g. pinch or fist) tracked with `HandLandmarker`.
- Anti-cheat: live-stream liveness (frame continuity, no static images), minimum rep duration
  (reject impossibly fast reps), landmark visibility + confidence thresholds, real-time
  per-frame processing (no post-hoc batch replay).
- The counter tracks `targetSets × targetReps`. On completion the client submits a signed
  completion record (timestamp, exercise, completed sets/reps, confidence). The server validates
  ownership of the open day and that server time is within the day's window, then marks the day
  `COMPLETED` and `wonBackBalance += dailyStakeAmount`.

### FR-7 Ledger & dashboard
- Display `totalCommitmentAmount`, `wonBackBalance` (safe to refund), `forfeitedBalance`,
  remaining days, and a per-day status list.
- All amounts shown in USD.

### FR-8 Single settlement refund
- After the final day's window ends (all days `COMPLETED` or `FORFEITED`):
  - if `wonBackBalance > 0`: one `client.refunds.create({ orderId, amountUnits: wonBackBalance×100,
    reason: "REQUESTED_BY_CUSTOMER", internalNote })`;
  - if `wonBackBalance == 0`: mark the challenge `SETTLED` with no refund and close it.
- Strict per-challenge idempotency: a `settlement_status` of `PENDING → SETTLED` guarded by a
  unique row/lock; a challenge is refunded **at most once**. Kelviq's "remaining refundable
  balance" is a secondary guard.
- Triggered by a Vercel Cron sweep (hourly) over challenges past their final-day window with
  `settlement_status = PENDING`, plus a lazy check on dashboard load.
- The refund outcome is recorded from `refund.updated` (`status: SUCCEEDED`), idempotently.

### FR-9 Auth & users
- Install and wire Better Auth (server route + client) on the existing
  `user`/`session`/`account`/`verification` tables.
- Auth methods: **Google OAuth and email magic-link. No email/password.**
- Each user has a stable id used as `userId` in Kelviq `metadata`.
- Link a user to their Kelviq customer id.

## 6. Non-Functional / Technical Constraints

- Vercel serverless end-to-end: pose verification client-side (browser WASM); Kelviq calls and
  webhooks via TanStack Start server routes (Nitro); settlement via Vercel Cron; persistence via
  Neon Postgres + Drizzle. No Python runtime.
- Secrets in env only: `KELVIQ_SERVER_API_KEY`, `KELVIQ_WEBHOOK_SECRET`, `KELVIQ_ENV` (default
  sandbox), `DATABASE_URL` (Neon), `BETTER_AUTH_SECRET`, Google OAuth client id/secret, and a
  magic-link email transport config. Never in client bundles or logs.
- Sandbox-first; production via env switch. Never expose the Server API Key to the browser.
- Security: webhook signature verified before any side effect; idempotency keys/locks on
  activation and settlement; parameterized queries (Drizzle); least privilege.
- Accessibility: contrast, visible focus, real labels, live-region status, reduced-motion.

## 7. Invariants (must hold at all times)

- A challenge is charged exactly once and refunded at most once.
- A day transitions to a terminal state at most once; `COMPLETED` is irreversible.
- `wonBackBalance = (#COMPLETED days) × dailyStake`.
- `forfeitedBalance = (#FORFEITED days) × dailyStake`.
- `wonBackBalance + forfeitedBalance + (remainingDays × dailyStake) = totalCommitmentAmount`.
- Settlement refund `amountUnits ≤ wonBackBalance × 100 ≤ totalCommitmentAmount × 100`.
- Day status is determined solely by server UTC + the pinned timezone.

## 8. Resolved decisions

- **OQ-1 (late activation):** the app asks the user at activation — Day 1 starts **Today** or
  **Tomorrow**; "Tomorrow" is preselected after 20:00 local. (Not auto-decided.)
- **OQ-2 (stake granularity):** whole USD dollars, no cents.
- **OQ-3 (auth method):** Google OAuth + email magic-link. No email/password.
- **OQ-4 (custom exercise):** every supported exercise has an authored MediaPipe rep module.
  v1 catalog = squat, push-up, jumping-jack, custom hand-gesture. Catalog is extensible.
