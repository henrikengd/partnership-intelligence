CREATE TABLE "company_need_incentive" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"company_id" uuid NOT NULL,
	"need_id" uuid NOT NULL,
	"description" text NOT NULL,
	"evidence_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"need_id" uuid NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"request_fingerprint" text NOT NULL,
	"selection" jsonb NOT NULL,
	"input_revision" integer NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error_category" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generation_run_status" CHECK ("generation_run"."status" IN ('running','completed','failed','interrupted')),
	CONSTRAINT "generation_run_finish" CHECK (("generation_run"."status"='running' AND "generation_run"."finished_at" IS NULL) OR ("generation_run"."status"<>'running' AND "generation_run"."finished_at" IS NOT NULL)),
	CONSTRAINT "generation_run_candidates" CHECK (jsonb_array_length("generation_run"."selection"->'companyIds') BETWEEN 1 AND 20)
);
--> statement-breakpoint
CREATE TABLE "opportunity_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"input_revision" integer NOT NULL,
	"brief_revision" integer NOT NULL,
	"reviewed_by" uuid NOT NULL,
	"fit_rationale" text NOT NULL,
	"ask" text NOT NULL,
	"contact_role" text NOT NULL,
	"target_person_id" uuid,
	"next_action" text NOT NULL,
	"approach_mode" text NOT NULL,
	"path_id" text,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_review_approach" CHECK ("opportunity_review"."approach_mode" IN ('cold','introduction'))
);
--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "human_factor_keys" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunity" ADD COLUMN "previous_opportunity_id" uuid;--> statement-breakpoint
ALTER TABLE "company_need_incentive" ADD CONSTRAINT "company_need_incentive_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_need_incentive" ADD CONSTRAINT "company_need_incentive_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_need_incentive" ADD CONSTRAINT "company_need_incentive_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_need_incentive" ADD CONSTRAINT "company_need_incentive_need_id_need_id_fk" FOREIGN KEY ("need_id") REFERENCES "public"."need"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_need_incentive" ADD CONSTRAINT "company_need_incentive_evidence_id_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_run" ADD CONSTRAINT "generation_run_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_run" ADD CONSTRAINT "generation_run_requested_by_auth_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_run" ADD CONSTRAINT "generation_run_need_id_need_id_fk" FOREIGN KEY ("need_id") REFERENCES "public"."need"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_review" ADD CONSTRAINT "opportunity_review_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_review" ADD CONSTRAINT "opportunity_review_opportunity_id_opportunity_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_review" ADD CONSTRAINT "opportunity_review_assessment_id_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_review" ADD CONSTRAINT "opportunity_review_reviewed_by_auth_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_review" ADD CONSTRAINT "opportunity_review_target_person_id_person_id_fk" FOREIGN KEY ("target_person_id") REFERENCES "public"."person"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "generation_run_idempotency" ON "generation_run" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
ALTER TABLE "opportunity" ADD CONSTRAINT "opportunity_previous_opportunity_id_opportunity_id_fk" FOREIGN KEY ("previous_opportunity_id") REFERENCES "public"."opportunity"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity" ADD CONSTRAINT "opportunity_review_state" CHECK ("opportunity"."review_state" IN ('research_needed','needs_review','ready_for_action'));