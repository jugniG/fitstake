---
inclusion: auto
name: kelviq
description: Kelviq integration conventions for Habit-Stakes — checkout, webhooks, and single-settlement refunds
---

# Kelviq conventions

Kelviq is the merchant of record. The Server API Key (`KELVIQ_SERVER_API_KEY`) and webhook secret
(`KELVIQ_WEBHOOK_SECRET`) are server-only (`src/lib/env.ts`, `src/lib/kelviq`); never import them
into client code.

- **Checkout:** a one-time charge uses `client.checkout.createSession({ planIdentifier,
  chargePeriod: 'ONE_TIME', customAmount, currencyCode: 'USD', taxBehavior: 'EXCLUSIVE',
  metadata })`. `metadata: { challengeId, userId }` is the correlation channel — it round-trips on
  `checkout.completed`. `customAmount` is major units (dollars). A product + one-time plan must
  exist in the Kelviq dashboard (`KELVIQ_COMMITMENT_PLAN_IDENTIFIER`).
- **Order linking:** orders carry no challenge metadata, so we link by Kelviq `customer_id` plus
  the one-active-challenge-per-user rule (`linkOrder` in `webhook-handler.ts`).
- **Webhooks:** the route reads the raw body and verifies with `validateEvent(raw, headers, secret)`
  (note the argument order). Idempotency is the `kelviq_event.eventId` unique row. Drive settlement
  completion off `refund.updated` with `status: 'SUCCEEDED'`, not `order.refunded`.
- **Single settlement refund:** `client.refunds.create({ orderId, amountUnits, reason })` in minor
  units, guarded by an atomic SQL `UPDATE ... WHERE status='active' AND settlementStatus='pending'`
  so a challenge is refunded at most once. The unique `settlementRefundId` is a secondary guard.
