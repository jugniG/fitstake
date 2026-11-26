import type { Landmark } from './types'

export function distance(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

// Angle in degrees at point b, between rays b->a and b->c.
export function angleAt(a: Landmark, b: Landmark, c: Landmark): number {
  const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z }
  const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z
  const magBa = Math.hypot(ba.x, ba.y, ba.z)
  const magBc = Math.hypot(bc.x, bc.y, bc.z)
  if (magBa === 0 || magBc === 0) return 0
  const cos = Math.max(-1, Math.min(1, dot / (magBa * magBc)))
  return (Math.acos(cos) * 180) / Math.PI
}

export function visibilityOf(lm: Landmark | undefined): number {
  return lm?.visibility ?? 1
}

// Pick the body side (left/right triplets) with the best landmark visibility.
export function bestSide(
  lm: Landmark[],
  sides: ReadonlyArray<readonly [number, number, number]>,
): readonly [number, number, number] | null {
  let best: readonly [number, number, number] | null = null
  let bestConf = 0
  for (const s of sides) {
    if (!lm[s[0]] || !lm[s[1]] || !lm[s[2]]) continue
    const conf = Math.min(visibilityOf(lm[s[0]]), visibilityOf(lm[s[1]]), visibilityOf(lm[s[2]]))
    if (conf > bestConf) {
      bestConf = conf
      best = s
    }
  }
  return best
}
