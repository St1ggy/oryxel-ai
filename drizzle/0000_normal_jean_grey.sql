CREATE TABLE "ai_patch_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"patch_id" integer,
	"action" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_pending_patch" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"patch_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"summary" text,
	"confidence" integer,
	"status" text DEFAULT 'created' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" text
);
--> statement-breakpoint
CREATE TABLE "brand" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "brand_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "fragrance" (
	"id" serial PRIMARY KEY NOT NULL,
	"brand_id" integer NOT NULL,
	"name" text NOT NULL,
	"pyramid_top" text,
	"pyramid_mid" text,
	"pyramid_base" text,
	"notes_summary" text
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_ai_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tone" text,
	"depth" text,
	"remember_context" boolean DEFAULT false NOT NULL,
	"default_provider" text,
	"default_model_label" text,
	CONSTRAINT "user_ai_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_fragrance" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"fragrance_id" integer NOT NULL,
	"list_type" text NOT NULL,
	"rating" integer DEFAULT 0 NOT NULL,
	"is_owned" boolean DEFAULT false NOT NULL,
	"status_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text,
	"bio" text,
	"avatar_url" text,
	"archetype" text,
	"favorite_note" text,
	"radar" jsonb,
	CONSTRAINT "user_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "ai_patch_audit_log" ADD CONSTRAINT "ai_patch_audit_log_patch_id_ai_pending_patch_id_fk" FOREIGN KEY ("patch_id") REFERENCES "public"."ai_pending_patch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fragrance" ADD CONSTRAINT "fragrance_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_fragrance" ADD CONSTRAINT "user_fragrance_fragrance_id_fragrance_id_fk" FOREIGN KEY ("fragrance_id") REFERENCES "public"."fragrance"("id") ON DELETE no action ON UPDATE no action;