CREATE SCHEMA "kiroween";
--> statement-breakpoint
CREATE TYPE "kiroween"."ChallengeStatus" AS ENUM('pending_charge', 'active', 'settling', 'settled');--> statement-breakpoint
CREATE TYPE "kiroween"."CustomGesture" AS ENUM('pinch', 'fist', 'open_hand');--> statement-breakpoint
CREATE TYPE "kiroween"."DayStatus" AS ENUM('locked', 'pending', 'completed', 'forfeited');--> statement-breakpoint
CREATE TYPE "kiroween"."ExerciseType" AS ENUM('squat', 'push_up', 'jumping_jack', 'custom_gesture');--> statement-breakpoint
CREATE TYPE "kiroween"."SettlementStatus" AS ENUM('pending', 'settled', 'none');--> statement-breakpoint
CREATE TABLE "kiroween"."account" (
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
CREATE TABLE "kiroween"."challenge" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"exerciseType" "kiroween"."ExerciseType" NOT NULL,
	"customGesture" "kiroween"."CustomGesture",
	"targetReps" integer NOT NULL,
	"targetSets" integer NOT NULL,
	"dailyStakeAmount" integer NOT NULL,
	"totalDays" integer NOT NULL,
	"totalCommitmentAmount" integer NOT NULL,
	"status" "kiroween"."ChallengeStatus" DEFAULT 'pending_charge' NOT NULL,
	"timezone" text,
	"activatedAt" timestamp with time zone,
	"startDayOffset" integer,
	"day1LocalDate" text,
	"kelviqCheckoutSessionId" text,
	"kelviqCheckoutUrl" text,
	"kelviqOrderId" text,
	"kelviqCustomerId" text,
	"settlementStatus" "kiroween"."SettlementStatus" DEFAULT 'pending' NOT NULL,
	"settlementRefundId" text,
	"settledAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kiroween"."day" (
	"id" text PRIMARY KEY NOT NULL,
	"challengeId" text NOT NULL,
	"dayNumber" integer NOT NULL,
	"localDate" text NOT NULL,
	"windowStartUtc" timestamp with time zone NOT NULL,
	"windowEndUtc" timestamp with time zone NOT NULL,
	"status" "kiroween"."DayStatus" DEFAULT 'locked' NOT NULL,
	"completedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kiroween"."kelviq_event" (
	"id" text PRIMARY KEY NOT NULL,
	"eventId" text NOT NULL,
	"eventType" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kelviq_event_eventId_unique" UNIQUE("eventId")
);
--> statement-breakpoint
CREATE TABLE "kiroween"."session" (
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
CREATE TABLE "kiroween"."user" (
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
CREATE TABLE "kiroween"."verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kiroween"."workout_verification" (
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
ALTER TABLE "kiroween"."account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "kiroween"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiroween"."challenge" ADD CONSTRAINT "challenge_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "kiroween"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiroween"."day" ADD CONSTRAINT "day_challengeId_challenge_id_fk" FOREIGN KEY ("challengeId") REFERENCES "kiroween"."challenge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiroween"."session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "kiroween"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiroween"."workout_verification" ADD CONSTRAINT "workout_verification_challengeId_challenge_id_fk" FOREIGN KEY ("challengeId") REFERENCES "kiroween"."challenge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "kiroween"."account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "challenge_userId_idx" ON "kiroween"."challenge" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "challenge_status_idx" ON "kiroween"."challenge" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_settlement_refund_id_unique" ON "kiroween"."challenge" USING btree ("settlementRefundId");--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_one_live_per_user" ON "kiroween"."challenge" USING btree ("userId") WHERE "kiroween"."challenge"."status" in ('pending_charge', 'active', 'settling');--> statement-breakpoint
CREATE UNIQUE INDEX "day_challenge_day_unique" ON "kiroween"."day" USING btree ("challengeId","dayNumber");--> statement-breakpoint
CREATE INDEX "day_status_idx" ON "kiroween"."day" USING btree ("status");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "kiroween"."session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "kiroween"."verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_verification_challenge_day_unique" ON "kiroween"."workout_verification" USING btree ("challengeId","dayNumber");