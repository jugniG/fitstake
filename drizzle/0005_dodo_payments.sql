CREATE TYPE "stakefit"."ChallengeState" AS ENUM('pending_mandate', 'active', 'mandate_lost', 'completed');--> statement-breakpoint
CREATE TYPE "stakefit"."CustomGesture" AS ENUM('pinch', 'fist', 'open_hand');--> statement-breakpoint
CREATE TYPE "stakefit"."DayStatus" AS ENUM('locked', 'pending', 'completed', 'forfeited');--> statement-breakpoint
CREATE TYPE "stakefit"."ExerciseType" AS ENUM('squat', 'push_up', 'jumping_jack', 'custom_gesture', 'leg_raise');--> statement-breakpoint
CREATE TYPE "stakefit"."StakeChargeStatus" AS ENUM('claimed', 'pending', 'succeeded', 'failed', 'abandoned');--> statement-breakpoint
CREATE TABLE "stakefit"."challenge" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"exerciseType" "stakefit"."ExerciseType" NOT NULL,
	"customGesture" "stakefit"."CustomGesture",
	"targetReps" integer NOT NULL,
	"targetSets" integer NOT NULL,
	"routine" jsonb NOT NULL,
	"dailyStakeAmount" integer NOT NULL,
	"totalDays" integer NOT NULL,
	"status" "stakefit"."ChallengeState" DEFAULT 'pending_mandate' NOT NULL,
	"timezone" text NOT NULL,
	"startDayOffset" integer NOT NULL,
	"activatedAt" timestamp with time zone,
	"day1LocalDate" text,
	"consentText" text NOT NULL,
	"consentedAt" timestamp with time zone NOT NULL,
	"dodoSubscriptionId" text,
	"mandateCheckoutUrl" text,
	"completedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "challenge_dodoSubscriptionId_unique" UNIQUE("dodoSubscriptionId")
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
CREATE TABLE "stakefit"."lifetime_access" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"dodoPaymentId" text NOT NULL,
	"amountCents" integer,
	"currency" text,
	"purchasedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lifetime_access_userId_unique" UNIQUE("userId"),
	CONSTRAINT "lifetime_access_dodoPaymentId_unique" UNIQUE("dodoPaymentId")
);
--> statement-breakpoint
CREATE TABLE "stakefit"."payment_event" (
	"id" text PRIMARY KEY NOT NULL,
	"webhookId" text NOT NULL,
	"eventType" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_event_webhookId_unique" UNIQUE("webhookId")
);
--> statement-breakpoint
CREATE TABLE "stakefit"."stake_charge" (
	"id" text PRIMARY KEY NOT NULL,
	"challengeId" text NOT NULL,
	"dayNumber" integer NOT NULL,
	"amountCents" integer NOT NULL,
	"status" "stakefit"."StakeChargeStatus" DEFAULT 'claimed' NOT NULL,
	"claimId" text,
	"claimedAt" timestamp with time zone,
	"dodoPaymentId" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"firstAttemptAt" timestamp with time zone,
	"nextAttemptAt" timestamp with time zone,
	"lastDeclineCode" text,
	"lastDeclineMessage" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stakefit"."user_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"dodoSubscriptionId" text NOT NULL,
	"status" text NOT NULL,
	"trialEndsAt" timestamp with time zone,
	"currentPeriodEndsAt" timestamp with time zone,
	"endsAt" timestamp with time zone,
	"sourceEventAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_subscription_userId_unique" UNIQUE("userId"),
	CONSTRAINT "user_subscription_dodoSubscriptionId_unique" UNIQUE("dodoSubscriptionId")
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
ALTER TABLE "stakefit"."user" ADD COLUMN "dodoCustomerId" text;--> statement-breakpoint
ALTER TABLE "stakefit"."challenge" ADD CONSTRAINT "challenge_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "stakefit"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakefit"."day" ADD CONSTRAINT "day_challengeId_challenge_id_fk" FOREIGN KEY ("challengeId") REFERENCES "stakefit"."challenge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakefit"."lifetime_access" ADD CONSTRAINT "lifetime_access_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "stakefit"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakefit"."stake_charge" ADD CONSTRAINT "stake_charge_challengeId_challenge_id_fk" FOREIGN KEY ("challengeId") REFERENCES "stakefit"."challenge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakefit"."user_subscription" ADD CONSTRAINT "user_subscription_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "stakefit"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stakefit"."workout_verification" ADD CONSTRAINT "workout_verification_challengeId_challenge_id_fk" FOREIGN KEY ("challengeId") REFERENCES "stakefit"."challenge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "challenge_userId_idx" ON "stakefit"."challenge" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "challenge_status_idx" ON "stakefit"."challenge" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_one_live_per_user" ON "stakefit"."challenge" USING btree ("userId") WHERE "stakefit"."challenge"."status" in ('pending_mandate', 'active', 'mandate_lost');--> statement-breakpoint
CREATE UNIQUE INDEX "day_challenge_day_unique" ON "stakefit"."day" USING btree ("challengeId","dayNumber");--> statement-breakpoint
CREATE INDEX "day_status_idx" ON "stakefit"."day" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "stake_charge_challenge_day_unique" ON "stakefit"."stake_charge" USING btree ("challengeId","dayNumber");--> statement-breakpoint
CREATE INDEX "stake_charge_status_idx" ON "stakefit"."stake_charge" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stake_charge_payment_idx" ON "stakefit"."stake_charge" USING btree ("dodoPaymentId");--> statement-breakpoint
CREATE INDEX "stake_charge_claim_idx" ON "stakefit"."stake_charge" USING btree ("claimId");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_verification_challenge_day_unique" ON "stakefit"."workout_verification" USING btree ("challengeId","dayNumber");--> statement-breakpoint
ALTER TABLE "stakefit"."user" ADD CONSTRAINT "user_dodoCustomerId_unique" UNIQUE("dodoCustomerId");