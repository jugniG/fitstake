CREATE SCHEMA IF NOT EXISTS "stakefit";
--> statement-breakpoint
CREATE TYPE "stakefit"."ChallengeStatus" AS ENUM('pending_charge', 'active', 'settling', 'settled');--> statement-breakpoint
CREATE TYPE "stakefit"."CustomGesture" AS ENUM('pinch', 'fist', 'open_hand');--> statement-breakpoint
CREATE TYPE "stakefit"."DayStatus" AS ENUM('locked', 'pending', 'completed', 'forfeited');--> statement-breakpoint
CREATE TYPE "stakefit"."ExerciseType" AS ENUM('squat', 'push_up', 'jumping_jack', 'custom_gesture');--> statement-breakpoint
CREATE TYPE "stakefit"."SettlementStatus" AS ENUM('pending', 'settled', 'none');--> statement-breakpoint
CREATE TABLE "stakefit"."account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"password" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stakefit"."challenge" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"exerciseType" "stakefit"."ExerciseType" NOT NULL,
	"customGesture" "stakefit"."CustomGesture",
	"targetReps" integer NOT NULL,
	"targetSets" integer NOT NULL,
	"dailyStakeAmount" integer NOT NULL,
	"totalDays" integer NOT NULL,
	"totalCommitmentAmount" integer NOT NULL,
	"status" "stakefit"."ChallengeStatus" DEFAULT 'pending_charge' NOT NULL,
	"timezone" text,
	"activatedAt" timestamp with time zone,
	"startDayOffset" integer,
	"day1LocalDate" text,
	"kelviqCheckoutSessionId" text,
	"kelviqCheckoutUrl" text,
	"kelviqOrderId" text,
	"kelviqCustomerId" text,
	"settlementStatus" "stakefit"."SettlementStatus" DEFAULT 'pending' NOT NULL,
	"settlementRefundId" text,
	"settledAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stakefit"."day" (
	"id" text PRIMARY KEY NOT NULL,
	"challengeId" text NOT NULL,
	"dayNumber" integer NOT NULL,
	"localDate" text NOT NULL,
	"windowStartUtc" timestamp with time zone NOT NULL,
	"windowEndUtc" timestamp with time zone NOT NULL,
	"status" "stakefit"."DayStatus" DEFAULT 'locked' NOT NULL,
	"completedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stakefit"."kelviq_event" (
	"id" text PRIMARY KEY NOT NULL,
	"eventId" text NOT NULL,
	"eventType" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kelviq_event_eventId_unique" UNIQUE("eventId")
);
--> statement-breakpoint
CREATE TABLE "stakefit"."session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "stakefit"."user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"kelviqCustomerId" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "stakefit"."user_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"kelviqSubscriptionId" text NOT NULL,
	"status" text NOT NULL,
	"trialEndsAt" timestamp with time zone,
	"currentPeriodEndsAt" timestamp with time zone,
	"endsAt" timestamp with time zone,
	"sourceModifiedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_subscription_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "stakefit"."verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stakefit"."workout_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"challengeId" text NOT NULL,
	"dayNumber" integer NOT NULL,
	"exercise" text NOT NULL,
	"setsCompleted" integer NOT NULL,
	"totalReps" integer NOT NULL,
	"confidence" numeric(5, 2),
	"durationSeconds" integer NOT NULL,
	"recordedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stakefit"."account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "stakefit"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakefit"."challenge" ADD CONSTRAINT "challenge_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "stakefit"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakefit"."day" ADD CONSTRAINT "day_challengeId_challenge_id_fk" FOREIGN KEY ("challengeId") REFERENCES "stakefit"."challenge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakefit"."session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "stakefit"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakefit"."user_subscription" ADD CONSTRAINT "user_subscription_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "stakefit"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakefit"."workout_verification" ADD CONSTRAINT "workout_verification_challengeId_challenge_id_fk" FOREIGN KEY ("challengeId") REFERENCES "stakefit"."challenge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "stakefit"."account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "challenge_userId_idx" ON "stakefit"."challenge" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "challenge_status_idx" ON "stakefit"."challenge" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_settlement_refund_id_unique" ON "stakefit"."challenge" USING btree ("settlementRefundId");--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_one_live_per_user" ON "stakefit"."challenge" USING btree ("userId") WHERE "stakefit"."challenge"."status" in ('pending_charge', 'active', 'settling');--> statement-breakpoint
CREATE UNIQUE INDEX "day_challenge_day_unique" ON "stakefit"."day" USING btree ("challengeId","dayNumber");--> statement-breakpoint
CREATE INDEX "day_status_idx" ON "stakefit"."day" USING btree ("status");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "stakefit"."session" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "user_subscription_kelviq_id_unique" ON "stakefit"."user_subscription" USING btree ("kelviqSubscriptionId");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "stakefit"."verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_verification_challenge_day_unique" ON "stakefit"."workout_verification" USING btree ("challengeId","dayNumber");
