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
  // Dodo's id for this user; every checkout attaches to it so saved cards and subscriptions line up.
  dodoCustomerId: text('dodoCustomerId').unique(),
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

// ── StakeFit domain tables ──
// Stakes are whole USD dollars; anything sent to Dodo is cents (×100).

export const exerciseTypeEnum = appSchema.enum('ExerciseType', [
  'squat',
  'push_up',
  'jumping_jack',
  'custom_gesture',
  'leg_raise',
])

export const customGestureEnum = appSchema.enum('CustomGesture', ['pinch', 'fist', 'open_hand'])

export const challengeStateEnum = appSchema.enum('ChallengeState', [
  'pending_mandate',
  'active',
  'mandate_lost',
  'completed',
])

export const dayStatusEnum = appSchema.enum('DayStatus', [
  'locked',
  'pending',
  'completed',
  'forfeited',
])

export const stakeChargeStatusEnum = appSchema.enum('StakeChargeStatus', [
  'claimed',
  'pending',
  'succeeded',
  'failed',
  'abandoned',
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
    // First exercise of the routine, kept for the record screen and history labels.
    exerciseType: exerciseTypeEnum('exerciseType').notNull(),
    customGesture: customGestureEnum('customGesture'),
    targetReps: integer('targetReps').notNull(),
    targetSets: integer('targetSets').notNull(),
    routine: jsonb('routine').notNull(), // RoutineExercise[]
    dailyStakeAmount: integer('dailyStakeAmount').notNull(), // USD dollars
    totalDays: integer('totalDays').notNull(),
    status: challengeStateEnum('status').notNull().default('pending_mandate'),
    timezone: text('timezone').notNull(), // IANA tz from setup, pinned for the challenge
    startDayOffset: integer('startDayOffset').notNull(), // 0 = Today, 1 = Tomorrow
    activatedAt: timestampTz('activatedAt'), // server time of the mandate's subscription.active
    day1LocalDate: text('day1LocalDate'), // yyyy-MM-dd in the pinned timezone
    // The exact statement the user agreed to before authorizing their card. Chargeback evidence.
    consentText: text('consentText').notNull(),
    consentedAt: timestampTz('consentedAt').notNull(),
    dodoSubscriptionId: text('dodoSubscriptionId').unique(), // on-demand mandate
    mandateCheckoutUrl: text('mandateCheckoutUrl'),
    completedAt: timestampTz('completedAt'),
    createdAt: timestampTz('createdAt').notNull().defaultNow(),
    updatedAt: timestampTz('updatedAt')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('challenge_userId_idx').on(t.userId),
    index('challenge_status_idx').on(t.status),
    // The application checks this before inserting, but only the database can stop two
    // concurrent setup requests from creating two live challenges for one user.
    uniqueIndex('challenge_one_live_per_user')
      .on(t.userId)
      .where(sql`${t.status} in ('pending_mandate', 'active', 'mandate_lost')`),
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

// One row per missed day. The unique (challengeId, dayNumber) is what guarantees a day is
// charged at most once, even if two requests race to charge it. Days missed since the last run
// are charged together in one Dodo payment (Dodo rejects a new charge while one is
// processing), so several rows can share a claimId and dodoPaymentId.
export const stakeCharge = appSchema.table(
  'stake_charge',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    challengeId: text('challengeId')
      .notNull()
      .references(() => challenge.id, { onDelete: 'cascade' }),
    dayNumber: integer('dayNumber').notNull(),
    amountCents: integer('amountCents').notNull(),
    status: stakeChargeStatusEnum('status').notNull().default('claimed'),
    // Groups the rows sent in one charge; also the Dodo idempotency key, so re-sending a claim
    // after a crash returns the original payment instead of charging again.
    claimId: text('claimId'),
    claimedAt: timestampTz('claimedAt'),
    dodoPaymentId: text('dodoPaymentId'),
    attempts: integer('attempts').notNull().default(0),
    firstAttemptAt: timestampTz('firstAttemptAt'),
    nextAttemptAt: timestampTz('nextAttemptAt'),
    lastDeclineCode: text('lastDeclineCode'),
    lastDeclineMessage: text('lastDeclineMessage'),
    createdAt: timestampTz('createdAt').notNull().defaultNow(),
    updatedAt: timestampTz('updatedAt')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('stake_charge_challenge_day_unique').on(t.challengeId, t.dayNumber),
    index('stake_charge_status_idx').on(t.status),
    index('stake_charge_payment_idx').on(t.dodoPaymentId),
    index('stake_charge_claim_idx').on(t.claimId),
  ],
)

// Weekly app plan. One row per user, written only by Dodo subscription webhooks.
export const userSubscription = appSchema.table('user_subscription', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('userId')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  dodoSubscriptionId: text('dodoSubscriptionId').notNull().unique(),
  status: text('status').notNull(), // Dodo status: pending | active | on_hold | cancelled | failed | expired
  trialEndsAt: timestampTz('trialEndsAt'),
  currentPeriodEndsAt: timestampTz('currentPeriodEndsAt'),
  endsAt: timestampTz('endsAt'), // set when cancellation is scheduled or has happened
  // Timestamp of the last applied webhook; Dodo can deliver events out of order.
  sourceEventAt: timestampTz('sourceEventAt'),
  createdAt: timestampTz('createdAt').notNull().defaultNow(),
  updatedAt: timestampTz('updatedAt')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

// One-time $49 lifetime purchase, written only by the payment.succeeded webhook.
export const lifetimeAccess = appSchema.table('lifetime_access', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('userId')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  dodoPaymentId: text('dodoPaymentId').notNull().unique(),
  amountCents: integer('amountCents'),
  currency: text('currency'),
  purchasedAt: timestampTz('purchasedAt').notNull().defaultNow(),
  createdAt: timestampTz('createdAt').notNull().defaultNow(),
})

// Lifetime bought with a 3-day trial: the card is authorized as an on-demand mandate and the
// app charges $49 once the trial ends. A paid trial also gets a lifetime_access row; this row
// stays as the record that the user's one trial is used.
export const lifetimeTrial = appSchema.table('lifetime_trial', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('userId')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  dodoSubscriptionId: text('dodoSubscriptionId').notNull().unique(),
  status: text('status').notNull(), // trialing | charging | paid | failed | cancelled
  trialEndsAt: timestampTz('trialEndsAt').notNull(),
  chargeClaimedAt: timestampTz('chargeClaimedAt'),
  dodoPaymentId: text('dodoPaymentId'),
  failureMessage: text('failureMessage'),
  createdAt: timestampTz('createdAt').notNull().defaultNow(),
  updatedAt: timestampTz('updatedAt')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

// Webhook idempotency and audit. The webhook-id header is unique per delivery.
export const paymentEvent = appSchema.table('payment_event', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  webhookId: text('webhookId').notNull().unique(),
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
  charges: many(stakeCharge),
}))

export const stakeChargeRelations = relations(stakeCharge, ({ one }) => ({
  challenge: one(challenge, { fields: [stakeCharge.challengeId], references: [challenge.id] }),
}))

// The reverse `one` is required for Drizzle to infer the join keys of the `days` many-relation.
export const dayRelations = relations(day, ({ one }) => ({
  challenge: one(challenge, { fields: [day.challengeId], references: [challenge.id] }),
}))
