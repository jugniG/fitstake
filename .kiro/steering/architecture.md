---
inclusion: auto
name: architecture
description: App architecture for Habit-Stakes — client/server split, where vision, Kelviq, and auth logic live
---

# Architecture

Habit-Stakes is a TanStack Start (React 19 + Vite + Nitro) app deployed to Vercel serverless, with Neon Postgres via Drizzle.

Two trust domains:

- **Client (`src/lib/vision`, routes, components):** camera capture + MediaPipe rep counting + UI. The client only _proposes_ a completion; the server decides.
- **Server (`src/lib/server`, `src/lib/kelviq`, `src/lib/auth`, API routes):** Better Auth, Kelviq checkout/webhooks/refund, day-window math, settlement sweep, persistence.

Money state lives in Postgres, never `localStorage`. All money is whole USD dollars internally; Kelviq calls convert to cents (×100).

Key flows:

- Setup → `createChallenge` server fn → Kelviq one-time checkout → `checkout.completed` webhook activates the challenge and opens Day 1.
- Daily → `completeDay` server fn validates the open window (server UTC + pinned TZ) and marks the day `completed`.
- End → Vercel Cron (`/api/cron/settle`) sweeps resolved challenges and issues one idempotent refund of the won-back balance.

Pure, unit-tested domain logic lives in `src/lib/challenge` (math, windows, state, settlement) and `src/lib/vision` (geometry, rep-counter, liveness). The server layer adapts these to Drizzle rows.
