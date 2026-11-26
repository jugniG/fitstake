import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export function getSchemaName(url?: string) {
  try {
    return new URL(url ?? process.env.DATABASE_URL ?? '').searchParams.get('schema') ?? 'public'
  } catch {
    return 'public'
  }
}

// unified schema - extracted from DATABASE_URL ?schema= param (like Prisma did)
// falls back to 'public'; drizzle-kit generate reads .env at generation time
export const appSchema = pgSchema(getSchemaName())
// keep alias for backward compat during migration
export const testSchema = appSchema

// All instants are stored with a timezone. Day windows are absolute UTC deadlines; a
// timezone-less column would make their meaning depend on the database session timezone.
const timestampTz = (name: string) => timestamp(name, { withTimezone: true })

// ── Better Auth core tables (kept from the TanStack SaaS template) ──
// The `better-auth` package is wired onto these existing tables; no email/password,
// only Google OAuth + email magic-link.

export const user = appSchema.table('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  kelviqCustomerId: text('kelviqCustomerId'),
  createdAt: timestampTz('createdAt').notNull().defaultNow(),
  updatedAt: timestampTz('updatedAt')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export const session = appSchema.table(
  'session',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    expiresAt: timestampTz('expiresAt').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestampTz('createdAt').notNull().defaultNow(),
    updatedAt: timestampTz('updatedAt')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index('session_userId_idx').on(t.userId)],
)

export const account = appSchema.table(
  'account',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    accountId: text('accountId').notNull(),
    providerId: text('providerId').notNull(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    idToken: text('idToken'),
    accessTokenExpiresAt: timestampTz('accessTokenExpiresAt'),
    refreshTokenExpiresAt: timestampTz('refreshTokenExpiresAt'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestampTz('createdAt').notNull().defaultNow(),
    updatedAt: timestampTz('updatedAt')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('account_userId_idx').on(t.userId)],
)

export const verification = appSchema.table(
  'verification',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestampTz('expiresAt').notNull(),
    createdAt: timestampTz('createdAt').notNull().defaultNow(),
    updatedAt: timestampTz('updatedAt')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
)

// ── Habit-stakes domain tables ──
// All money is whole USD dollars (Kelviq calls convert to cents: ×100).

export const exerciseTypeEnum = appSchema.enum('ExerciseType', [
  'squat',
  'push_up',
  'jumping_jack',
  'custom_gesture',
])

export const customGestureEnum = appSchema.enum('CustomGesture', ['pinch', 'fist', 'open_hand'])

export const challengeStatusEnum = appSchema.enum('ChallengeStatus', [
  'pending_charge',
  'active',
  'settling',
  'settled',
])

export const dayStatusEnum = appSchema.enum('DayStatus', [
  'locked',
  'pending',
  'completed',
  'forfeited',
])

export const settlementStatusEnum = appSchema.enum('SettlementStatus', [
  'pending',
  'settled',
  'none',
])

export const challenge = appSchema.table(
  'challenge',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    exerciseType: exerciseTypeEnum('exerciseType').notNull(),
    customGesture: customGestureEnum('customGesture'),
    targetReps: integer('targetReps').notNull(),
    targetSets: integer('targetSets').notNull(),
    dailyStakeAmount: integer('dailyStakeAmount').notNull(), // USD dollars
    totalDays: integer('totalDays').notNull(),
    totalCommitmentAmount: integer('totalCommitmentAmount').notNull(), // USD dollars
    status: challengeStatusEnum('status').notNull().default('pending_charge'),
    timezone: text('timezone'), // IANA tz, pinned at activation
    activatedAt: timestampTz('activatedAt'), // UTC, set on checkout.completed
    startDayOffset: integer('startDayOffset'), // 0 = Today, 1 = Tomorrow
    day1LocalDate: text('day1LocalDate'), // yyyy-MM-dd in the pinned timezone
    kelviqCheckoutSessionId: text('kelviqCheckoutSessionId'),
    kelviqCheckoutUrl: text('kelviqCheckoutUrl'),
    kelviqOrderId: text('kelviqOrderId'),
    kelviqCustomerId: text('kelviqCustomerId'),
    settlementStatus: settlementStatusEnum('settlementStatus').notNull().default('pending'),
    settlementRefundId: text('settlementRefundId'),
    settledAt: timestampTz('settledAt'),
    createdAt: timestampTz('createdAt').notNull().defaultNow(),
    updatedAt: timestampTz('updatedAt')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('challenge_userId_idx').on(t.userId),
    index('challenge_status_idx').on(t.status),
    uniqueIndex('challenge_settlement_refund_id_unique').on(t.settlementRefundId),
    // The application checks this before inserting, but only the database can stop two
    // concurrent setup requests from creating two live challenges for one user.
    uniqueIndex('challenge_one_live_per_user')
      .on(t.userId)
      .where(sql`${t.status} in ('pending_charge', 'active', 'settling')`),
  ],
)

export const day = appSchema.table(
  'day',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    challengeId: text('challengeId')
      .notNull()
      .references(() => challenge.id, { onDelete: 'cascade' }),
    dayNumber: integer('dayNumber').notNull(),
    localDate: text('localDate').notNull(), // yyyy-MM-dd in the pinned timezone
    windowStartUtc: timestampTz('windowStartUtc').notNull(),
    windowEndUtc: timestampTz('windowEndUtc').notNull(), // deadline
    status: dayStatusEnum('status').notNull().default('locked'),
    completedAt: timestampTz('completedAt'),
    createdAt: timestampTz('createdAt').notNull().defaultNow(),
    updatedAt: timestampTz('updatedAt')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('day_challenge_day_unique').on(t.challengeId, t.dayNumber),
    index('day_status_idx').on(t.status),
  ],
)

export const workoutVerification = appSchema.table(
  'workout_verification',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    challengeId: text('challengeId')
      .notNull()
      .references(() => challenge.id, { onDelete: 'cascade' }),
    dayNumber: integer('dayNumber').notNull(),
    exercise: text('exercise').notNull(),
    setsCompleted: integer('setsCompleted').notNull(),
    totalReps: integer('totalReps').notNull(),
    confidence: numeric('confidence', { precision: 5, scale: 2 }),
    durationSeconds: integer('durationSeconds').notNull(),
    recordedAt: timestampTz('recordedAt').notNull().defaultNow(),
    note: text('note'),
    createdAt: timestampTz('createdAt').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('workout_verification_challenge_day_unique').on(t.challengeId, t.dayNumber)],
)

export const kelviqEvent = appSchema.table('kelviq_event', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  eventId: text('eventId').notNull().unique(), // Kelviq webhook-id / event id
  eventType: text('eventType').notNull(),
  payload: jsonb('payload').notNull(),
  processedAt: timestampTz('processedAt').notNull().defaultNow(),
  createdAt: timestampTz('createdAt').notNull().defaultNow(),
})

// relations - keeps drizzle query includes unified
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}))

export const challengeRelations = relations(challenge, ({ one, many }) => ({
  user: one(user, { fields: [challenge.userId], references: [user.id] }),
  days: many(day),
}))

// The reverse `one` is required for Drizzle to infer the join keys of the `days` many-relation.
export const dayRelations = relations(day, ({ one }) => ({
  challenge: one(challenge, { fields: [day.challengeId], references: [challenge.id] }),
}))
