CREATE TABLE "opportunity_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"from_state" text NOT NULL,
	"to_state" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"occurred_date" date NOT NULL,
	"partnership_id" uuid,
	"review_id" uuid,
	"recorded_by" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "opportunity_event_action" CHECK ("opportunity_event"."action" IN ('transition','reopen','agreement')),
	CONSTRAINT "opportunity_event_states" CHECK ("opportunity_event"."from_state" IN ('suggested','shortlisted','pursuing','agreed','declined','archived') AND "opportunity_event"."to_state" IN ('suggested','shortlisted','pursuing','agreed','declined','archived')),
	CONSTRAINT "opportunity_event_closed_reason" CHECK ("opportunity_event"."to_state" NOT IN ('declined','archived') OR length(trim("opportunity_event"."reason")) > 0),
	CONSTRAINT "opportunity_event_agreement" CHECK ("opportunity_event"."action" <> 'agreement' OR ("opportunity_event"."to_state"='agreed' AND "opportunity_event"."partnership_id" IS NOT NULL AND length(trim("opportunity_event"."source")) > 0))
);
--> statement-breakpoint
ALTER TABLE "activity" ADD COLUMN "occurred_date" date;--> statement-breakpoint
ALTER TABLE "activity" ADD COLUMN "follow_up_resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "activity" ADD COLUMN "follow_up_resolved_by" uuid;--> statement-breakpoint
ALTER TABLE "opportunity" ADD COLUMN "partnership_id" uuid;--> statement-breakpoint
ALTER TABLE "opportunity_event" ADD CONSTRAINT "opportunity_event_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_event" ADD CONSTRAINT "opportunity_event_opportunity_id_opportunity_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_event" ADD CONSTRAINT "opportunity_event_partnership_id_partnership_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnership"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_event" ADD CONSTRAINT "opportunity_event_review_id_opportunity_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."opportunity_review"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_event" ADD CONSTRAINT "opportunity_event_recorded_by_auth_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "opportunity_event_request" ON "opportunity_event" USING btree ("organization_id","request_id");--> statement-breakpoint
CREATE INDEX "opportunity_event_history" ON "opportunity_event" USING btree ("organization_id","opportunity_id","created_at");--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_follow_up_resolved_by_auth_user_id_fk" FOREIGN KEY ("follow_up_resolved_by") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity" ADD CONSTRAINT "opportunity_partnership_id_partnership_id_fk" FOREIGN KEY ("partnership_id") REFERENCES "public"."partnership"("id") ON DELETE no action ON UPDATE no action;