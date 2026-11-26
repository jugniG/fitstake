import { kelviq } from './client'

export type SettlementRefundResult = { refundId: string; status: string }

export async function createSettlementRefund(args: {
  orderId: string
  amountUnits: number
  challengeId: string
}): Promise<SettlementRefundResult> {
  const refund = await kelviq.refunds.create({
    orderId: args.orderId,
    amountUnits: args.amountUnits,
    reason: 'REQUESTED_BY_CUSTOMER',
    internalNote: `habit-stakes settlement (challenge ${args.challengeId})`,
  })
  return { refundId: refund.id, status: refund.status }
}

// Recovery path: if the refund.updated webhook was missed, a cron sweep can confirm the refund status.
export async function retrieveRefundStatus(
  refundId: string,
): Promise<{ status: string; orderId: string | null }> {
  const refund = await kelviq.refunds.retrieve({ refundId })
  return { status: refund.status, orderId: refundOrderId(refund.order) }
}

// The refund list is the source of truth when a create request succeeded but the process
// died before storing the refund id. Finding the existing refund is the only safe way to
// retry: creating another one could refund the user twice.
export async function findSettlementRefund(args: {
  orderId: string
  challengeId: string
}): Promise<SettlementRefundResult | null> {
  const page = await kelviq.refunds.list({ pageSize: 100 })
  const note = `challenge ${args.challengeId}`
  const match = page.results.find(
    (refund) => refund.internalNote?.includes(note) || refundOrderId(refund.order) === args.orderId,
  )
  return match ? { refundId: match.id, status: match.status } : null
}

function refundOrderId(order: Record<string, unknown> | undefined): string | null {
  if (!order) return null
  const id = order.id ?? order.orderId
  return id == null ? null : String(id)
}
