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
CREATE TABLE "background_job" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"params" jsonb,
	"progress" jsonb DEFAULT '[]'::jsonb,
	"result" jsonb,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
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
CREATE TABLE "translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"locale" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"actor" text DEFAULT 'user' NOT NULL,
	"provider" text,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"platform_access" boolean DEFAULT false NOT NULL,
	"min_pyramid_notes" integer DEFAULT 1 NOT NULL,
	"max_pyramid_notes" integer DEFAULT 5 NOT NULL,
	"min_recommendations" integer DEFAULT 5 NOT NULL,
	"max_recommendations" integer DEFAULT 20 NOT NULL,
	CONSTRAINT "user_ai_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_ai_provider_key" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"label" text NOT NULL,
	"encrypted_key" text NOT NULL,
	"key_iv" text NOT NULL,
	"key_auth_tag" text NOT NULL,
	"key_version" text DEFAULT 'v1' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_chat_message" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"encrypted_content" text NOT NULL,
	"content_iv" text NOT NULL,
	"content_auth_tag" text NOT NULL,
	"content_version" text DEFAULT 'v1' NOT NULL,
	"scenario" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_fragrance" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"fragrance_id" integer NOT NULL,
	"rating" integer DEFAULT 0 NOT NULL,
	"is_owned" boolean DEFAULT false NOT NULL,
	"is_tried" boolean DEFAULT false NOT NULL,
	"is_liked" boolean DEFAULT false NOT NULL,
	"is_disliked" boolean DEFAULT false NOT NULL,
	"is_recommendation" boolean DEFAULT false NOT NULL,
	"agent_comment" text,
	"user_comment" text,
	"season" text,
	"time_of_day" text,
	"gender" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text,
	"bio" text,
	"preferences" text,
	"avatar_url" text,
	"archetype" text,
	"favorite_note" text,
	"radar" jsonb,
	"radar_labels" jsonb,
	"suggestions" jsonb,
	"gender" text,
	"note_relationships" jsonb,
	CONSTRAINT "user_profile_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_patch_audit_log" ADD CONSTRAINT "ai_patch_audit_log_patch_id_ai_pending_patch_id_fk" FOREIGN KEY ("patch_id") REFERENCES "public"."ai_pending_patch"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fragrance" ADD CONSTRAINT "fragrance_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_fragrance" ADD CONSTRAINT "user_fragrance_fragrance_id_fragrance_id_fk" FOREIGN KEY ("fragrance_id") REFERENCES "public"."fragrance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "translations_key_locale_idx" ON "translations" USING btree ("key","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "user_ai_provider_key_user_provider_label_idx" ON "user_ai_provider_key" USING btree ("user_id","provider","label");--> statement-breakpoint
CREATE UNIQUE INDEX "user_fragrance_user_fragrance_idx" ON "user_fragrance" USING btree ("user_id","fragrance_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");