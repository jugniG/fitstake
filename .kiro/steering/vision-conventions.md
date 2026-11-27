---
inclusion: auto
name: vision-conventions
description: How to add or edit a MediaPipe rep-counting exercise module in src/lib/vision
---

# Vision conventions

Every supported exercise has a dedicated, pure rep module under `src/lib/vision/exercises/`. Rep
counting runs in the browser via `@mediapipe/tasks-vision` (`PoseLandmarker` for body moves,
`HandLandmarker` for custom hand gestures). The WASM is self-hosted in `public/wasm` (copied from
`node_modules/@mediapipe/tasks-vision/wasm` so the JS/WASM versions match); models load from the
Google CDN at runtime.

To add a new exercise:

1. Implement an `evaluate(lm: Landmark[] | null): FrameEval` in `exercises/<name>.ts` that returns
   `phase: 'a' | 'b'` (baseline → flexed), `confidence`, and `visible`. Reuse `angleAt` / `distance`
   from `geometry.ts`.
2. Register it in `buildRepCounter` (`src/lib/vision/index.ts`) and in `EXERCISE_LABELS`
   (`src/lib/challenge/types.ts`).
3. Add it to the setup form's exercise enum and the create-challenge zod schema.
4. Add a unit test that feeds a synthetic landmark cycle through `createRepCounter` and asserts a
   rep is counted (and rejected when too fast / low confidence).

Anti-cheat is enforced by `rep-counter.ts` (min flexed-phase duration rejects bouncing/impossibly
fast reps and low-confidence frames never advance state) and `liveness.ts` (frame continuity).
Keep these guards on every exercise - never count reps without them.
