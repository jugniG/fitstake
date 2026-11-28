# Habit-Stakes - Requirements

> Status: DRAFT v2 - payment model changed from "upfront pot + end refund" (Kelviq) to
> "charge each missed day" (Dodo Payments). Awaiting review. Currency: USD, whole dollars.
> Payments: Dodo Payments (merchant of record). Hosting: Vercel (serverless).

## 1. Overview

Habit-Stakes (StakeFit) is a real-money habit-accountability app. A user sets up a challenge
(duration, daily stake, exercises), authorizes a card once, and does a camera-verified workout
each day. **A completed day costs nothing. Each missed day is charged that day's stake.** There
is no upfront pot and no refund at the end.

Access to the app itself is a separate plan: **$2/week with a 3-day free trial**, or **$9.99 once
for lifetime**. All payments, including stakes and plans, go through Dodo Payments. Kelviq is
removed entirely.

## 2. Decisions

- **D-1 Provider:** Dodo Payments only. Every Kelviq module, route, table, column, env var and
  steering doc is removed. Existing Kelviq rows are test data and are not migrated.
- **D-2 Stake billing:** a Dodo **on-demand subscription** per challenge. Checkout authorizes a
  mandate without charging (`mandate_only: true`). Missed days are charged later with
  `POST /subscriptions/{id}/charge` and a custom amount. Dodo usage meters are not used: they bill
  per cycle at a dashboard-fixed unit price, and stakes vary per user.
- **D-3 Charge timing:** when the user opens the app, the server charges every past missed day
  that hasn't been charged yet. See OQ-1 for a backstop.
- **D-4 Access plans:** both move to Dodo. Weekly is a Dodo subscription product with
  `trial_period_days: 3`. Lifetime is a one-time Dodo product. Lifetime cancels an active weekly
  subscription.
- **D-5 Integration pattern:** follow `C:\s\opencmo`: the `dodopayments` Node SDK,
  `checkoutSessions.create`, `metadata.userId` for correlation and `webhooks.unwrap` for
  verification. Add what opencmo lacks: webhook idempotency, stored Dodo customer and
  subscription ids, `payment.*` handling and the on-demand charge call.
- **Unchanged:** Better Auth (Google + magic link), local-calendar day windows in a pinned IANA
  timezone, in-browser MediaPipe verification, step-by-step onboarding before the plan step.

## 3. Goals

- User-defined challenges: exercises, sets, reps, `dailyStakeAmount` (whole USD),
  `totalDays` (1–365). `maxExposure = totalDays × dailyStakeAmount`.
- An explicit, informed card mandate per challenge. No money moves until a day is missed.
- At most one charge per missed day, never more than `maxExposure` in total per challenge.
- Safe handling of declined charges, following Dodo's retry guidance.
- App access gated by the weekly or lifetime plan.

## 4. Non-goals

- Upfront pots, escrow wording, end-of-challenge refunds, settlement sweeps.
- Refunding a charged missed day (support can refund manually in the Dodo dashboard).
- Dodo usage meters, credits, or adaptive pricing.
- Wearables, nutrition, blockchain, social features, Python sidecar.

## 5. Functional requirements

### FR-1 Challenge configuration (unchanged in shape)

- Onboarding collects duration, daily stake, exercises and start day (Today/Tomorrow), one
  question per screen, saved as a browser draft until the mandate step.
- The routine is stored in a proper `routine` jsonb column. (The current code stores it in
  `challenge.kelviqCustomerId`; this is fixed.)
- The challenge is persisted as `pending_mandate` before the mandate checkout.

### FR-2 Consent

- Before the mandate checkout the user sees, and must actively confirm, a statement that names
  the amounts, for example: "You authorize StakeFit to charge your card $10 for each day you miss,
  up to $300 over 30 days. Completed days cost nothing."
- The confirmation time and the exact statement shown are stored on the challenge.

### FR-3 Mandate checkout (stakes)

- `checkoutSessions.create` with the stake product, `customer: { customer_id }`,
  `subscription_data: { on_demand: { mandate_only: true } }`,
  `metadata: { kind: 'stake_mandate', challengeId, userId }` and a `return_url` back to the app.
- The webhook `subscription.active` (matched by `metadata.challengeId`) activates the challenge:
  stores the Dodo subscription id, sets `activatedAt` from server time, pins the timezone and
  creates the day rows. A return to the app before the webhook shows "activating" and polls.

### FR-4 Day lifecycle (unchanged)

- `locked → pending → completed | forfeited`, derived from server UTC and the pinned timezone.
- `completed` is irreversible. A day becomes `forfeited` once its window ends without completion.

### FR-5 Missed-day charges

- On every app open (`getDashboard`), the server finds this user's `forfeited` days that have no
  charge record, oldest first, and charges each one `dailyStakeAmount`.
- Each charge is first claimed by inserting a `stake_charge` row with a unique
  `(challengeId, dayNumber)`, then sent to Dodo with an idempotency key
  `stake:{challengeId}:{dayNumber}` and `metadata: { kind: 'stake_charge', challengeId, dayNumber }`.
- `payment.succeeded` marks the row `succeeded`. `payment.failed` marks it `failed` with the
  decline reason.
- The charge description names the day, for example "StakeFit: missed Day 4 (Nov 24)".
- A charge never runs for a day that is `completed`, `pending` or `locked`.

### FR-6 Failed charges

- Dodo does not retry on-demand charges, so the app does, following Dodo's guidance: retry at
  +3, +10 and +17 days from the first attempt, at most 4 attempts in total.
- Hard declines are never retried: `STOLEN_CARD`, `LOST_CARD`, `PICKUP_CARD`, `FRAUDULENT`,
  `TRANSACTION_NOT_APPROVED`, `AUTHENTICATION_FAILURE`.
- A `409` (a payment still pending) defers the attempt; it is not counted as a failure.
- While any stake charge is unpaid, the user cannot start a new challenge, and the dashboard
  shows the amount owed and an "Update card" action (Dodo
  `POST /subscriptions/{id}/update-payment-method`).
- After the final attempt fails, the charge is marked `abandoned` and the debt stays visible.

### FR-7 Mandate lifecycle

- If the user cancels the mandate in the Dodo portal, or it fails, mid-challenge
  (`subscription.cancelled` / `subscription.failed` / `subscription.expired`), the challenge moves
  to `mandate_lost`. Days missed afterwards cannot be charged; the dashboard explains this and
  offers to re-authorize. New challenges are blocked until resolved.
- When the challenge ends (all days terminal and all charges resolved), the server cancels the
  on-demand subscription via `PATCH /subscriptions/{id}` `{ status: 'cancelled' }` and marks the
  challenge `completed`.

### FR-8 Access plans

- Weekly: Dodo subscription product priced $2/week, checkout with `trial_period_days: 3` for a
  user's first subscription only. Card required.
- Lifetime: Dodo one-time product priced $9.99. Granted on `payment.succeeded` with
  `metadata.kind = 'lifetime'`. Cancels an active weekly subscription.
- Access rules are unchanged: lifetime, trial or active weekly grants access; a user with a
  running challenge keeps access to finish it; a new challenge needs a plan.

### FR-9 Webhooks

- One route, `POST /api/webhooks/dodo`, reads the raw body and verifies it with
  `dodo.webhooks.unwrap(raw, { headers })` before any side effect. Invalid signatures return 401.
- Idempotency: the `webhook-id` header is stored in a unique `payment_event` row inside the same
  transaction as the side effects; duplicates are acknowledged with no changes.
- Handled: `subscription.active`, `subscription.renewed`, `subscription.on_hold`,
  `subscription.cancelled`, `subscription.failed`, `subscription.expired`,
  `subscription.plan_changed`, `payment.succeeded`, `payment.failed`. Others are logged and acked.

### FR-10 Dashboard

- Shows days completed, days missed, amount charged so far, amount owed (failed charges),
  remaining days, remaining maximum exposure, and per-day status with each day's charge status.

### FR-11 Auth (unchanged)

- Better Auth, Google OAuth and email magic link. The Dodo customer id is stored on `user`.

## 6. Non-functional

- Secrets server-only, in env: `DODO_API_KEY`, `DODO_WEBHOOK_SECRET`. Never logged or bundled.
- Test mode first (`DODO_MODE=test_mode`); live via env switch.
- Every caught error is logged with a prefix (`[dodo]`, `[stake-charge]`, `[webhook]`) and shown
  to the user as an actionable message.
- Accessibility rules from `AGENTS.md` apply to the consent, paywall and dashboard UI.

## 7. Invariants

- A day is charged at most once: unique `stake_charge(challengeId, dayNumber)`.
- Only `forfeited` days are charged, and only after their window has ended (server time).
- Each charge amount equals the challenge's `dailyStakeAmount`.
- Total charged per challenge ≤ `forfeitedDays × dailyStakeAmount` ≤ `maxExposure`.
- `completed` days are never charged, including if a charge job races with a late completion:
  completion and charge claim both check the stored status in one transaction.
- No charge is attempted without an active mandate and recorded consent.

## 8. Open questions

- **OQ-1 Users who stop opening the app.** With charges only on app open, a user who quits the
  app is never charged, which defeats the stake. Proposal: keep app-open as the primary trigger
  and add a daily Vercel Cron backstop that charges any missed day older than 24 hours.
- **OQ-2 One or two checkouts.** Onboarding has two Dodo checkouts: the plan, then the stake
  mandate. Proposal: keep them separate for now (different product types).
- **OQ-3 Merchant terms.** Confirm with Dodo that charging a penalty for a missed workout is
  allowed under their merchant policy before going live.
