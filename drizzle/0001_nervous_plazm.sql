CREATE TABLE "kiroween"."user_subscription" (
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
ALTER TABLE "kiroween"."user_subscription" ADD CONSTRAINT "user_subscription_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "kiroween"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_subscription_kelviq_id_unique" ON "kiroween"."user_subscription" USING btree ("kelviqSubscriptionId");