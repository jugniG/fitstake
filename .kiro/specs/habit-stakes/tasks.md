# Habit-Stakes - Tasks (v2: Dodo Payments)

Source of truth: `requirements.md` v2 and `design.md` v2.

## Done (v1, kept)

- [x] Better Auth (Google + magic link), `_protected` guard
- [x] Pure day windows (TZ/DST), day state machine, tests
- [x] MediaPipe vision engine, rep modules, liveness guard, tests
- [x] Step-by-step onboarding with browser draft (`6213c60`)

## v2 implementation

- [ ] 1. Remove Kelviq: `src/lib/kelviq/*`, `routes/api/webhooks/kelviq.ts`, `settle.ts`,
      `challenge/settlement.ts` + test, the settle cron, `@kelviq/node-sdk` dependency,
      `.kiro/steering/kelviq.md`
- [ ] 2. Install `dodopayments@2.63.1`; add `src/lib/dodo/client.ts`; update `env.ts`,
      `.env.example` and `.env` (Dodo keys added blank, Kelviq keys removed)
- [ ] 3. Schema: `dodoCustomerId`, challenge `routine`/consent/mandate columns and new status
      enum, `stake_charge`, `payment_event`, renamed plan columns; generate migration
      (review, run only with approval)
- [ ] 4. Pure `challenge/charges.ts` (due days, retry schedule, hard declines, cap) + tests
- [ ] 5. `dodo/customers.ts`, `dodo/checkout.ts` (weekly, lifetime, stake mandate)
- [ ] 6. `stake-charges.server.ts` (claim → charge → record), wired into `getDashboard`;
      `completeDay` takes the day row lock
- [ ] 7. `/api/webhooks/dodo` + rewritten `webhook-handler.ts` (unwrap, idempotency, events)
- [ ] 8. Access: Dodo plans, owed-charge and mandate-lost blocks; paywall wiring
- [ ] 9. UI: consent step in onboarding, dashboard charges/owed/update-card, remove pot and
      escrow copy everywhere (setup, landing, FAQ, money summary)
- [ ] 10. Daily cron backstop `/api/cron/charge-missed` + `vercel.json` (if OQ-1 is accepted)
- [ ] 11. Docs: `README.md`, `HANDOFF.md`, `architecture.md`, new `.kiro/steering/dodo.md`
- [ ] 12. Verify: typecheck, lint, tests

## Manual setup (you)

- [ ] Dodo dashboard (test mode): create products - weekly subscription $2/week, lifetime
      one-time $49, stake subscription for on-demand mandates - and copy their ids into `.env`
- [ ] API key → `DODO_API_KEY`; webhook endpoint `<APP_URL>/api/webhooks/dodo` → signing secret
      → `DODO_WEBHOOK_SECRET`
- [ ] Confirm with Dodo that missed-workout penalty charges fit their merchant policy (OQ-3)
- [ ] Run the migration once reviewed: `npm run db:migrate`
