CREATE TABLE "ai_configuration" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"provider" text DEFAULT 'openai' NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"updated_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_provider_allowed" CHECK ("ai_configuration"."provider" = 'openai')
);
--> statement-breakpoint
CREATE TABLE "ai_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"input_revision" integer NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"request_fingerprint" text NOT NULL,
	"last_action_key" uuid NOT NULL,
	"last_action_fingerprint" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"packet" jsonb NOT NULL,
	"reference_map" jsonb NOT NULL,
	"model" text NOT NULL,
	"config_revision" timestamp with time zone NOT NULL,
	"draft" jsonb,
	"error_category" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_run_status" CHECK ("ai_run"."status" IN ('running','completed','failed','interrupted')),
	CONSTRAINT "ai_run_attempt" CHECK ("ai_run"."attempt" BETWEEN 1 AND 2),
	CONSTRAINT "ai_run_finish" CHECK (("ai_run"."status"='running' AND "ai_run"."finished_at" IS NULL) OR ("ai_run"."status"<>'running' AND "ai_run"."finished_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "ai_configuration" ADD CONSTRAINT "ai_configuration_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_configuration" ADD CONSTRAINT "ai_configuration_updated_by_auth_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_run" ADD CONSTRAINT "ai_run_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_run" ADD CONSTRAINT "ai_run_opportunity_id_opportunity_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_run" ADD CONSTRAINT "ai_run_assessment_id_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_run" ADD CONSTRAINT "ai_run_requested_by_auth_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_run_idempotency" ON "ai_run" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_run_one_live_call" ON "ai_run" USING btree ("organization_id") WHERE "ai_run"."status" = 'running';