CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"target_person_id" uuid,
	"target_role" text DEFAULT '' NOT NULL,
	"channel" text NOT NULL,
	"description" text NOT NULL,
	"follow_up_date" date,
	"completed_at" timestamp with time zone,
	CONSTRAINT "activity_status_completion" CHECK (("activity"."status"='planned' AND "activity"."completed_at" IS NULL) OR ("activity"."status"='completed' AND "activity"."completed_at" IS NOT NULL)),
	CONSTRAINT "activity_kind" CHECK ("activity"."kind" IN ('introduction','outreach','meeting','follow_up'))
);
--> statement-breakpoint
CREATE TABLE "affiliation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"person_id" uuid NOT NULL,
	"role" text NOT NULL,
	"state" text DEFAULT 'current' NOT NULL,
	"start_date" date,
	"end_date" date,
	CONSTRAINT "affiliation_dates" CHECK ("affiliation"."start_date" IS NULL OR "affiliation"."end_date" IS NULL OR "affiliation"."start_date" <= "affiliation"."end_date"),
	CONSTRAINT "affiliation_state" CHECK ("affiliation"."state" IN ('current','ended','unknown')),
	CONSTRAINT "affiliation_current_end" CHECK ("affiliation"."state" <> 'current' OR "affiliation"."end_date" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"rubric_version" text DEFAULT 'v1' NOT NULL,
	"input_revision" integer NOT NULL,
	"factors" jsonb NOT NULL,
	"brief" jsonb NOT NULL,
	"priority" numeric(6, 2) NOT NULL,
	"coverage" integer NOT NULL,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"evidence_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"company_id" uuid NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"evidence_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"domain" text,
	"description" text DEFAULT '' NOT NULL,
	"source_id" text
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claim" text NOT NULL,
	"source_type" text NOT NULL,
	"url" text,
	"attribution" text,
	"excerpt" text NOT NULL,
	"observed_date" date NOT NULL,
	"review_state" text DEFAULT 'supplied' NOT NULL,
	"review_date" date,
	CONSTRAINT "evidence_source" CHECK (("evidence"."source_type"='supplied_source' AND "evidence"."url" IS NOT NULL) OR ("evidence"."source_type"='observation' AND "evidence"."attribution" IS NOT NULL)),
	CONSTRAINT "evidence_review_state" CHECK ("evidence"."review_state" IN ('supplied','reviewed','disputed','superseded')),
	CONSTRAINT "evidence_review_date" CHECK ("evidence"."review_state" <> 'reviewed' OR "evidence"."review_date" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "need" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"urgency" integer,
	"deadline" date,
	"estimated_value" numeric(14, 2),
	"currency" text DEFAULT 'NOK' NOT NULL,
	"partnership_type" text DEFAULT 'in_kind' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "need_urgency_bounds" CHECK ("need"."urgency" IS NULL OR "need"."urgency" BETWEEN 0 AND 4),
	CONSTRAINT "need_value_nonnegative" CHECK ("need"."estimated_value" IS NULL OR "need"."estimated_value" >= 0)
);
--> statement-breakpoint
CREATE TABLE "opportunity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"need_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"partnership_type" text NOT NULL,
	"state" text DEFAULT 'suggested' NOT NULL,
	"review_state" text DEFAULT 'needs_review' NOT NULL,
	"owner_id" uuid,
	"manual_brief" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"input_revision" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "opportunity_state" CHECK ("opportunity"."state" IN ('suggested','shortlisted','pursuing','agreed','declined','archived'))
);
--> statement-breakpoint
CREATE TABLE "person" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"source_id" text,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationship" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"person_id" uuid NOT NULL,
	"target_person_id" uuid,
	"company_id" uuid,
	"title" text DEFAULT '' NOT NULL,
	"state" text DEFAULT 'current' NOT NULL,
	"start_date" date,
	"end_date" date,
	"strength" integer,
	"willingness" text DEFAULT 'unknown' NOT NULL,
	"willingness_date" date,
	"willingness_source" text,
	"evidence_id" uuid NOT NULL,
	CONSTRAINT "relationship_endpoints" CHECK (("relationship"."kind" IN ('works_at','previously_worked_at','interned_at') AND "relationship"."company_id" IS NOT NULL AND "relationship"."target_person_id" IS NULL) OR ("relationship"."kind" IN ('knows','introduced_by','studied_with') AND "relationship"."target_person_id" IS NOT NULL AND "relationship"."company_id" IS NULL AND "relationship"."person_id" <> "relationship"."target_person_id")),
	CONSTRAINT "relationship_dates" CHECK ("relationship"."start_date" IS NULL OR "relationship"."end_date" IS NULL OR "relationship"."start_date" <= "relationship"."end_date"),
	CONSTRAINT "relationship_state" CHECK ("relationship"."state" IN ('current','ended','unknown')),
	CONSTRAINT "relationship_current_end" CHECK ("relationship"."state" <> 'current' OR "relationship"."end_date" IS NULL),
	CONSTRAINT "relationship_strength" CHECK ("relationship"."strength" IS NULL OR "relationship"."strength" BETWEEN 0 AND 4),
	CONSTRAINT "relationship_willingness" CHECK ("relationship"."willingness" IN ('yes','no','unknown') AND ("relationship"."willingness"='unknown' OR ("relationship"."willingness_date" IS NOT NULL AND "relationship"."willingness_source" IS NOT NULL)))
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_opportunity_id_opportunity_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_target_person_id_person_id_fk" FOREIGN KEY ("target_person_id") REFERENCES "public"."person"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliation" ADD CONSTRAINT "affiliation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliation" ADD CONSTRAINT "affiliation_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliation" ADD CONSTRAINT "affiliation_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_opportunity_id_opportunity_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_evidence" ADD CONSTRAINT "assessment_evidence_assessment_id_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_evidence" ADD CONSTRAINT "assessment_evidence_evidence_id_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability" ADD CONSTRAINT "capability_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability" ADD CONSTRAINT "capability_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability" ADD CONSTRAINT "capability_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability" ADD CONSTRAINT "capability_evidence_id_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "need" ADD CONSTRAINT "need_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "need" ADD CONSTRAINT "need_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity" ADD CONSTRAINT "opportunity_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity" ADD CONSTRAINT "opportunity_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity" ADD CONSTRAINT "opportunity_need_id_need_id_fk" FOREIGN KEY ("need_id") REFERENCES "public"."need"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity" ADD CONSTRAINT "opportunity_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity" ADD CONSTRAINT "opportunity_owner_id_auth_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship" ADD CONSTRAINT "relationship_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship" ADD CONSTRAINT "relationship_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship" ADD CONSTRAINT "relationship_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship" ADD CONSTRAINT "relationship_target_person_id_person_id_fk" FOREIGN KEY ("target_person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship" ADD CONSTRAINT "relationship_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationship" ADD CONSTRAINT "relationship_evidence_id_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."evidence"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "affiliation_person_role" ON "affiliation" USING btree ("organization_id","person_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_opportunity_version" ON "assessment" USING btree ("opportunity_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_evidence_pair" ON "assessment_evidence" USING btree ("assessment_id","evidence_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_active_unique" ON "opportunity" USING btree ("organization_id","need_id","company_id","partnership_type") WHERE "opportunity"."state" NOT IN ('declined','archived');