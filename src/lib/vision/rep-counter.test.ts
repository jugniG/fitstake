import { describe, expect, it } from 'vitest'
import { createRepCounter } from './rep-counter'
import type { FrameEval, Landmark } from './types'

function queuedEval(queue: FrameEval[]) {
  let i = 0
  return () => queue[i++]
}

const DUMMY: Landmark[] = []

describe('rep counter state machine', () => {
  it('counts one rep on a baseline -> flexed -> baseline cycle held long enough', () => {
    const queue: FrameEval[] = [
      { phase: 'a', confidence: 1, visible: true },
      { phase: 'a', confidence: 1, visible: true },
      { phase: 'b', confidence: 1, visible: true },
      { phase: 'b', confidence: 1, visible: true },
      { phase: 'b', confidence: 1, visible: true },
      { phase: 'a', confidence: 1, visible: true },
    ]
    const nows = [0, 100, 200, 300, 500, 700]
    const rc = createRepCounter({ evaluate: queuedEval(queue), minPhaseMs: 200 })
    for (let i = 0; i < queue.length; i += 1) rc.onFrame(DUMMY, nows[i])
    expect(rc.reps).toBe(1)
  })

  it('rejects a rep when the flexed phase was too short (rep-too-fast)', () => {
    const queue: FrameEval[] = [
      { phase: 'a', confidence: 1, visible: true },
      { phase: 'b', confidence: 1, visible: true },
      { phase: 'a', confidence: 1, visible: true },
    ]
    const nows = [0, 100, 200]
    const rc = createRepCounter({ evaluate: queuedEval(queue), minPhaseMs: 200 })
    for (let i = 0; i < queue.length; i += 1) rc.onFrame(DUMMY, nows[i])
    expect(rc.reps).toBe(0)
  })

  it('ignores low-confidence frames and does not advance state', () => {
    const queue: FrameEval[] = [
      { phase: 'a', confidence: 1, visible: true },
      { phase: 'b', confidence: 0.2, visible: true },
      { phase: 'a', confidence: 1, visible: true },
    ]
    const nows = [0, 100, 1000]
    const rc = createRepCounter({
      evaluate: queuedEval(queue),
      minPhaseMs: 200,
      minConfidence: 0.5,
    })
    for (let i = 0; i < queue.length; i += 1) rc.onFrame(DUMMY, nows[i])
    expect(rc.reps).toBe(0)
  })

  it('counts multiple reps across separate cycles', () => {
    const queue: FrameEval[] = [
      'a',
      'b',
      'b',
      'a', // rep 1
      'b',
      'b',
      'a', // rep 2
    ].map((phase) => ({ phase: phase as 'a' | 'b', confidence: 1, visible: true }))
    const nows = [0, 200, 500, 700, 900, 1200, 1400]
    const rc = createRepCounter({ evaluate: queuedEval(queue), minPhaseMs: 200 })
    for (let i = 0; i < queue.length; i += 1) rc.onFrame(DUMMY, nows[i])
    expect(rc.reps).toBe(2)
  })
})
