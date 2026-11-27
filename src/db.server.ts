import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './db/schema.js'
import { getSchemaName } from './db/schema.js'

const dbSchema = getSchemaName()
const connectionString = process.env.DATABASE_URL ?? ''
// Hosted Postgres (Neon, Supabase) needs explicit SSL config; pg does not read sslmode
// from the connection string. Local Postgres usually has SSL disabled.
const isLocal = /(?:^|@)(?:localhost|127\.0\.0\.1|\[::1\])(?::|\/)/i.test(connectionString)
const needsSsl = !isLocal && /sslmode=require|neon\.tech|supabase\.(com|co)/i.test(connectionString)

const pool = new Pool({
  connectionString,
  ...(dbSchema !== 'public' ? { options: `-c search_path=${dbSchema}` } : {}),
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  // Hosted poolers (Supabase Supavisor, Neon) close idle connections on their side. Without
  // these, pg keeps the dead socket and the next query fails with "Connection terminated
  // unexpectedly". Release idle clients early and keep live ones from being dropped silently.
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
  max: 5,
})

// An idle client killed by the server emits here. Without a listener Node treats it as an
// unhandled error; with one, pg discards the client and the next query gets a fresh one.
pool.on('error', (error) => {
  console.error('[db] idle connection closed by the server:', error.message)
})

// A factory keeps the schema-typed return type so the HMR global reuses the same type
// (and so `db.query.<table>` is properly typed).
const createDb = () => drizzle({ client: pool, schema })

declare global {
  var __db: ReturnType<typeof createDb> | undefined
}

export const db = globalThis.__db ?? createDb()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__db = db
}

export { pool }
export * from './db/schema.js'
