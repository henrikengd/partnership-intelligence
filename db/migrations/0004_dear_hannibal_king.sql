CREATE TABLE "import_batch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"rows" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" jsonb,
	"mappings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_batch_status" CHECK ("import_batch"."status" IN ('pending','committed','cancelled','expired'))
);
--> statement-breakpoint
CREATE TABLE "onboarding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"step" integer DEFAULT 0 NOT NULL,
	"skipped_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "onboarding_organization_id_unique" UNIQUE("organization_id"),
	CONSTRAINT "onboarding_step" CHECK ("onboarding"."step" BETWEEN 0 AND 8)
);
--> statement-breakpoint
CREATE TABLE "partnership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_id" text,
	"company_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"state" text DEFAULT 'current' NOT NULL,
	"start_date" date,
	"end_date" date,
	"description" text DEFAULT '' NOT NULL,
	"evidence_id" uuid,
	CONSTRAINT "partnership_state" CHECK ("partnership"."state" IN ('current','ended','unknown')),
	CONSTRAINT "partnership_dates" CHECK ("partnership"."start_date" IS NULL OR "partnership"."end_date" IS NULL OR "partnership"."start_date" <= "partnership"."end_date"),
	CONSTRAINT "partnership_current_end" CHECK ("partnership"."state" <> 'current' OR "partnership"."end_date" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "previous_outreach" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"company_id" uuid NOT NULL,
	"person_id" uuid,
	"contact_role" text DEFAULT '' NOT NULL,
	"channel" text NOT NULL,
	"occurred_date" date NOT NULL,
	"description" text NOT NULL,
	"outcome" text DEFAULT 'unknown' NOT NULL,
	"source" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "relationship" ADD COLUMN "source_id" text;--> statement-breakpoint
ALTER TABLE "import_batch" ADD CONSTRAINT "import_batch_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batch" ADD CONSTRAINT "import_batch_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding" ADD CONSTRAINT "onboarding_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnership" ADD CONSTRAINT "partnership_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnership" ADD CONSTRAINT "partnership_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnership" ADD CONSTRAINT "partnership_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnership" ADD CONSTRAINT "partnership_evidence_id_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "previous_outreach" ADD CONSTRAINT "previous_outreach_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "previous_outreach" ADD CONSTRAINT "previous_outreach_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "previous_outreach" ADD CONSTRAINT "previous_outreach_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "previous_outreach" ADD CONSTRAINT "previous_outreach_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_batch_expiry" ON "import_batch" USING btree ("organization_id","status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "partnership_source_id" ON "partnership" USING btree ("organization_id","source_id") WHERE "partnership"."source_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "company_source_id" ON "company" USING btree ("organization_id","source_id") WHERE "company"."source_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "person_source_id" ON "person" USING btree ("organization_id","source_id") WHERE "person"."source_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "relationship_source_id" ON "relationship" USING btree ("organization_id","source_id") WHERE "relationship"."source_id" IS NOT NULL;