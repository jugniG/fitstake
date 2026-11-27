---
inclusion: auto
name: architecture
description: App architecture for Habit-Stakes - client/server split, where vision, Dodo payments, and auth logic live
---

# Architecture

StakeFit is a TanStack Start (React 19 + Vite + Nitro) app deployed to Vercel serverless, with
Postgres via Drizzle and Dodo Payments as merchant of record.

Two trust domains:

- **Client (`src/lib/vision`, routes, components):** camera capture + MediaPipe rep counting + UI.
  The client only _proposes_ a completion; the server decides.
- **Server (`src/lib/server`, `src/lib/dodo`, `src/lib/auth*`, API routes):** Better Auth, Dodo
  checkouts, webhooks and missed-day charges, day-window math, persistence.

Money state lives in Postgres, never `localStorage`. Stakes are whole USD dollars internally;
Dodo calls use cents (×100).

Key flows:

- Access → `/paywall` → Dodo weekly ($2/week, 3-day trial) or lifetime ($49) checkout → webhook
  writes `user_subscription` / `lifetime_access`.
- Setup → consent checkbox → `createChallenge` → Dodo on-demand mandate checkout (nothing charged)
  → `subscription.active` webhook activates the challenge and creates the day rows.
- Daily → `completeDay` validates the open window (server UTC + pinned TZ) and marks the day
  `completed`. A completed day costs nothing.
- Missed day → on the next dashboard load (or the daily cron `/api/cron/charge-missed`),
  `chargeDueDays` charges every unpaid missed day once through `subscriptions.charge`.
- End → when every day is decided and every missed day is paid, the challenge is `completed` and
  its mandate cancelled.

Pure, unit-tested domain logic lives in `src/lib/challenge` (math, windows, state, charges),
`src/lib/access.ts`, and `src/lib/vision` (geometry, rep-counter, liveness). The server layer
adapts these to Drizzle rows. See the `dodo` steering doc for payment rules.
