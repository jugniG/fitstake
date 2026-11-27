import { and, eq, isNull } from 'drizzle-orm'
import { db, user } from '#/db.server'
import { assertDodoConfigured, dodo } from './client'

// Returns the Dodo customer id for a user, creating the customer once. Every checkout attaches
// to this id, so the weekly plan, lifetime purchase and stake mandates share one customer and
// webhooks can always be traced back to the user.
export async function ensureDodoCustomer(sessionUser: {
  id: string
  email: string
  name: string
}): Promise<string> {
  const existing = await db.query.user.findFirst({
    where: eq(user.id, sessionUser.id),
    columns: { dodoCustomerId: true },
  })
  if (existing?.dodoCustomerId) return existing.dodoCustomerId

  assertDodoConfigured()
  const created = await dodo.customers.create({
    email: sessionUser.email,
    name: sessionUser.name.trim() || sessionUser.email,
    metadata: { userId: sessionUser.id },
  })
  // Two tabs can race here. Only the first id is stored; the loser uses the stored one, and its
  // extra Dodo customer is harmless because nothing references it.
  const stored = await db
    .update(user)
    .set({ dodoCustomerId: created.customer_id })
    .where(and(eq(user.id, sessionUser.id), isNull(user.dodoCustomerId)))
    .returning({ dodoCustomerId: user.dodoCustomerId })
  if (stored.at(0)?.dodoCustomerId) return created.customer_id

  const winner = await db.query.user.findFirst({
    where: eq(user.id, sessionUser.id),
    columns: { dodoCustomerId: true },
  })
  if (!winner?.dodoCustomerId) throw new Error('Could not save the Dodo customer id.')
  return winner.dodoCustomerId
}
