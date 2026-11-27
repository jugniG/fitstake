---
inclusion: auto
name: testing
description: The invariant and state-machine tests that must stay green for Habit-Stakes
---

# Testing

Domain logic is pure and unit-tested with Vitest in `src/lib/challenge/*.test.ts` and
`src/lib/vision/*.test.ts`. These must stay green for any change to the rules:

- **Challenge math** (`math.test.ts`): `completed + missed + remaining == totalDays`,
  `charged + owed == missed × stake`, and never more than `days × stake`.
- **Day windows** (`windows.test.ts`): local-calendar-day boundaries across timezones, the
  Today/Tomorrow start, and DST (23h spring-forward / 25h fall-back).
- **Rep/set state transitions** (`state.test.ts`): locked → pending → completed | forfeited;
  completed is irreversible; out-of-window completion is rejected.
- **Forfeiture rules** (`state.test.ts`): a pending day lapses to forfeited past its deadline.
- **Missed-day charges** (`charges.test.ts`): only forfeited days are charged, each at most once;
  retries at +3/+10/+17 days, 4 attempts max, never after a hard decline.
- **Access** (`src/lib/access.test.ts`): plan rules, trial once per user, and unpaid charges or a
  lost card mandate block new challenges.
- **Rep counter** (`rep-counter.test.ts`): a held cycle counts a rep; a too-short cycle does not;
  low-confidence frames do not advance state.
- **Liveness** (`liveness.test.ts`): duplicate frames and long gaps are rejected.

Run with `npm test`. Typecheck with `npx tsc --noEmit`. Never weaken an invariant test to make a
change pass — fix the logic instead.
