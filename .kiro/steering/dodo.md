---
inclusion: auto
name: dodo
description: Dodo Payments conventions for StakeFit - checkouts, on-demand stake mandates, missed-day charges and webhooks
---

# Dodo Payments conventions

Dodo is the merchant of record. `DODO_API_KEY` and `DODO_WEBHOOK_SECRET` are server-only
(`src/lib/env.ts`, `src/lib/dodo/*`); never import them into client code. `DODO_MODE` must match
the key and the product ids (`test_mode` or `live_mode`).

- **Client:** `src/lib/dodo/client.ts` builds one `DodoPayments` with `bearerToken`,
  `environment` and `webhookKey`. Call `assertDodoConfigured()` before API calls.
- **Customers:** every checkout uses `customer: { customer_id }` from `ensureDodoCustomer`
  (stored on `user.dodoCustomerId`). Webhooks find the user by that id, never by metadata alone.
- **Checkouts** (`src/lib/dodo/checkout.ts`) all use `checkoutSessions.create` with
  `metadata.kind`: `weekly` (subscription, `subscription_data.trial_period_days: 3` for a
  first-time subscriber only), `lifetime` (one-time), `stake_mandate` (one per challenge,
  `subscription_data.on_demand.mandate_only: true`, nothing charged).
- **Missed-day charges** (`src/lib/server/stake-charges.server.ts`): run on every dashboard load
  and from the daily cron. Never call `subscriptions.charge` anywhere else.
  - A day is claimed by its unique `stake_charge(challengeId, dayNumber)` row inside a
    transaction that locks the challenge row. That row is what makes a day chargeable once.
  - All newly due days go in one charge (Dodo returns 409 while a payment is processing), with
    `idempotencyKey: stake:{claimId}` so re-sending a crashed claim can't double-charge.
  - Dodo does not retry on-demand charges. Retries are ours: +3, +10, +17 days, 4 attempts max,
    never after a hard decline (see `challenge/charges.ts`). Don't add faster retries; bursts get
    flagged as card testing.
  - `completeDay` marks a day completed only `WHERE status IN ('locked','pending')`, so a late
    completion can't race a charge.
- **Webhooks** (`src/routes/api/webhooks/dodo.ts`): read `request.text()`, verify with
  `dodo.webhooks.unwrap(raw, { headers })` (401 on failure), and store the `webhook-id` in
  `payment_event` in the same transaction as the side effects. Return 500 on handler errors so
  Dodo retries. Products are identified by the env product ids first, metadata second.
- **Ending a challenge** cancels its mandate (`subscriptions.update(id, { status: 'cancelled' })`)
  only after every missed day is paid; unpaid days keep it open for "Update card".
