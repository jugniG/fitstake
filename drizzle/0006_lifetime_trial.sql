CREATE TABLE "stakefit"."lifetime_trial" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"dodoSubscriptionId" text NOT NULL,
	"status" text NOT NULL,
	"trialEndsAt" timestamp with time zone NOT NULL,
	"chargeClaimedAt" timestamp with time zone,
	"dodoPaymentId" text,
	"failureMessage" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lifetime_trial_userId_unique" UNIQUE("userId"),
	CONSTRAINT "lifetime_trial_dodoSubscriptionId_unique" UNIQUE("dodoSubscriptionId")
);
--> statement-breakpoint
ALTER TABLE "stakefit"."lifetime_trial" ADD CONSTRAINT "lifetime_trial_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "stakefit"."user"("id") ON DELETE cascade ON UPDATE no action;