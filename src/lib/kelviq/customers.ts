import { NotFoundError } from '@kelviq/node-sdk'
import { kelviq } from './client'

export type KelviqCustomer = { id: string; customerId: string }

function isNotFound(error: unknown): boolean {
  return error instanceof NotFoundError || (error as { statusCode?: number }).statusCode === 404
}

function isConflict(error: unknown): boolean {
  return (error as { statusCode?: number }).statusCode === 409
}

// Use our own user id as Kelviq's client-defined customer id. Unlike Kelviq's internal id,
// it exists before checkout, so order.created can be linked even if it arrives before the
// checkout.completed webhook.
export async function ensureKelviqCustomer(args: {
  userId: string
  email?: string | null
  name?: string | null
}): Promise<KelviqCustomer> {
  const desiredName = args.name?.trim() || null

  try {
    const existing = await kelviq.customers.retrieve({ customerId: args.userId })
    if (desiredName && (!existing.name || existing.name !== desiredName)) {
      try {
        await kelviq.customers.update({
          customerId: args.userId,
          name: desiredName,
          ...(args.email ? { email: args.email } : {}),
        })
      } catch (updateErr) {
        console.error('[kelviq] failed to update existing customer details:', updateErr)
      }
    }
    return { id: existing.id, customerId: existing.customerId }
  } catch (error) {
    if (!isNotFound(error)) {
      console.error('[kelviq] customer lookup failed:', error)
      throw error
    }
  }

  try {
    const created = await kelviq.customers.create({
      customerId: args.userId,
      email: args.email ?? null,
      name: desiredName,
    })
    return { id: created.id, customerId: created.customerId }
  } catch (error) {
    if (isConflict(error)) {
      const existing = await kelviq.customers.retrieve({ customerId: args.userId })
      if (desiredName && (!existing.name || existing.name !== desiredName)) {
        try {
          await kelviq.customers.update({
            customerId: args.userId,
            name: desiredName,
            ...(args.email ? { email: args.email } : {}),
          })
        } catch (updateErr) {
          console.error('[kelviq] failed to update existing customer details:', updateErr)
        }
      }
      return { id: existing.id, customerId: existing.customerId }
    }
    console.error('[kelviq] customer creation failed:', error)
    throw error
  }
}
