CREATE TABLE "stakefit"."lifetime_access" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"kelviqCheckoutSessionId" text NOT NULL,
	"kelviqOrderId" text,
	"amountUnits" integer,
	"currency" text,
	"purchasedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lifetime_access_userId_unique" UNIQUE("userId"),
	CONSTRAINT "lifetime_access_kelviqCheckoutSessionId_unique" UNIQUE("kelviqCheckoutSessionId")
);
--> statement-breakpoint
ALTER TABLE "stakefit"."lifetime_access" ADD CONSTRAINT "lifetime_access_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "stakefit"."user"("id") ON DELETE cascade ON UPDATE no action;