DROP TABLE IF EXISTS "stakefit"."challenge" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "stakefit"."day" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "stakefit"."kelviq_event" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "stakefit"."lifetime_access" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "stakefit"."user_subscription" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "stakefit"."workout_verification" CASCADE;--> statement-breakpoint
ALTER TABLE "stakefit"."user" DROP COLUMN IF EXISTS "kelviqCustomerId";--> statement-breakpoint
DROP TYPE IF EXISTS "stakefit"."ChallengeStatus";--> statement-breakpoint
DROP TYPE IF EXISTS "stakefit"."CustomGesture";--> statement-breakpoint
DROP TYPE IF EXISTS "stakefit"."DayStatus";--> statement-breakpoint
DROP TYPE IF EXISTS "stakefit"."ExerciseType";--> statement-breakpoint
DROP TYPE IF EXISTS "stakefit"."SettlementStatus";
