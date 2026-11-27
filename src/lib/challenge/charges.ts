import type { DayStatus, StakeChargeStatus } from './types'

// Missed-day charge rules. Dodo does not retry on-demand charges, so the retry schedule here
// follows Dodo's guidance: +3, +10 and +17 days after the first attempt, 4 attempts at most,
// and never retry a hard decline (retrying those gets flagged as card testing).

export const MAX_CHARGE_ATTEMPTS = 4
const RETRY_OFFSET_DAYS = [3, 10, 17]
const DAY_MS = 24 * 60 * 60 * 1000

const HARD_DECLINES = new Set([
  'STOLEN_CARD',
  'LOST_CARD',
  'PICKUP_CARD',
  'FRAUDULENT',
  'TRANSACTION_NOT_APPROVED',
  'AUTHENTICATION_FAILURE',
])

export function isHardDecline(code: string | null | undefined): boolean {
  return !!code && HARD_DECLINES.has(code.toUpperCase())
}

// When to try again after `attemptsMade` failed attempts, anchored to the first attempt so
// retries keep the same time of day. Null means stop.
export function nextAttemptAt(
  firstAttemptAt: Date,
  attemptsMade: number,
  declineCode: string | null,
): Date | null {
  if (isHardDecline(declineCode)) return null
  if (attemptsMade >= MAX_CHARGE_ATTEMPTS) return null
  const offsetDays = RETRY_OFFSET_DAYS[attemptsMade - 1]
  if (offsetDays === undefined) return null
  return new Date(firstAttemptAt.getTime() + offsetDays * DAY_MS)
}

export type ChargeableDay = { dayNumber: number; status: DayStatus }
export type ExistingCharge = {
  dayNumber: number
  status: StakeChargeStatus
  nextAttemptAt: Date | null
}

// Day numbers to put in a new claim, oldest first. A day is charged only if it is forfeited,
// and only once: either it has no charge row yet or a failed attempt's retry time has come.
// Rows already claimed or pending are handled by the in-flight checks, not here.
export function dueChargeDays(
  days: ChargeableDay[],
  charges: ExistingCharge[],
  now: Date,
): number[] {
  const byDay = new Map(charges.map((charge) => [charge.dayNumber, charge]))
  return days
    .filter((day) => day.status === 'forfeited')
    .filter((day) => {
      const charge = byDay.get(day.dayNumber)
      if (!charge) return true
      if (charge.status === 'failed') {
        return charge.nextAttemptAt !== null && charge.nextAttemptAt.getTime() <= now.getTime()
      }
      return false
    })
    .map((day) => day.dayNumber)
    .sort((a, b) => a - b)
}

// A claim older than this with no Dodo payment id is assumed to have crashed mid-call and is
// re-sent with the same idempotency key. Younger claims are treated as in flight.
export const STALE_CLAIM_MS = 10 * 60 * 1000

export function isStaleClaim(claimedAt: Date | null, now: Date): boolean {
  return !claimedAt || now.getTime() - claimedAt.getTime() > STALE_CLAIM_MS
}

// Sent to Dodo with each charge so re-sending the same claim can't create a second payment.
export function stakeIdempotencyKey(claimId: string): string {
  return `stake:${claimId}`
}

// One payment covers every day in the claim.
export function chargeDescription(days: Array<{ dayNumber: number; localDate: string }>): string {
  const sorted = [...days].sort((a, b) => a.dayNumber - b.dayNumber)
  const labels = sorted.map((day) => `Day ${day.dayNumber} (${day.localDate})`)
  return `StakeFit: missed ${labels.join(', ')}`
}
