---
inclusion: auto
name: testing
description: The invariant and state-machine tests that must stay green for Habit-Stakes
---

# Testing

Domain logic is pure and unit-tested with Vitest in `src/lib/challenge/*.test.ts` and
`src/lib/vision/*.test.ts`. These must stay green for any change to the rules:

- **Challenge math** (`math.test.ts`): totals and the `wonBack + forfeited + remaining == total`
  invariant.
- **Day windows** (`windows.test.ts`): local-calendar-day boundaries across timezones, the
  Today/Tomorrow start, and DST (23h spring-forward / 25h fall-back).
- **Rep/set state transitions** (`state.test.ts`): locked → pending → completed | forfeited;
  completed is irreversible; out-of-window completion is rejected.
- **Forfeiture rules** (`state.test.ts`): a pending day lapses to forfeited past its deadline.
- **Idempotent single-refund settlement** (`settlement.test.ts`): only one caller acquires the
  lock; a challenge is refunded at most once; won-back == 0 closes without a refund.
- **Rep counter** (`rep-counter.test.ts`): a held cycle counts a rep; a too-short cycle does not;
  low-confidence frames do not advance state.
- **Liveness** (`liveness.test.ts`): duplicate frames and long gaps are rejected.

Run with `npm test`. Typecheck with `npx tsc --noEmit`. Never weaken an invariant test to make a
change pass — fix the logic instead.
