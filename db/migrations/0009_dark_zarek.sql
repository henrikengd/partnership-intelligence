CREATE TABLE "demo_installation" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"dataset_version" text NOT NULL,
	"organization_id" uuid,
	"state" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demo_singleton" CHECK ("demo_installation"."id"=1),
	CONSTRAINT "demo_state" CHECK ("demo_installation"."state" IN ('seeding','ready'))
);
--> statement-breakpoint
ALTER TABLE "demo_installation" ADD CONSTRAINT "demo_installation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;