ALTER TABLE "user_profile" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "is_discoverable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "default_list_visibility" text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "default_post_visibility" text DEFAULT 'followers' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "show_diary_stats" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_profile_username_idx" ON "user_profile" USING btree ("username");--> statement-breakpoint
CREATE TABLE "user_list" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"kind" text DEFAULT 'custom' NOT NULL,
	"diary_filter" jsonb,
	"visibility" text DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "user_list_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"list_id" integer NOT NULL,
	"fragrance_id" integer NOT NULL,
	"user_fragrance_id" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"note" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "user_follow" (
	"id" serial PRIMARY KEY NOT NULL,
	"follower_id" text NOT NULL,
	"following_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "post" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"visibility" text DEFAULT 'followers' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "post_attachment" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"kind" text NOT NULL,
	"entity_id" integer,
	"url" text,
	"meta" jsonb
);--> statement-breakpoint
CREATE TABLE "notification" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_id" text NOT NULL,
	"actor_id" text,
	"type" text NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"payload" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "notification_preference" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);--> statement-breakpoint
ALTER TABLE "user_list_item" ADD CONSTRAINT "user_list_item_list_id_user_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."user_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_list_item" ADD CONSTRAINT "user_list_item_fragrance_id_fragrance_id_fk" FOREIGN KEY ("fragrance_id") REFERENCES "public"."fragrance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_list_item" ADD CONSTRAINT "user_list_item_user_fragrance_id_user_fragrance_id_fk" FOREIGN KEY ("user_fragrance_id") REFERENCES "public"."user_fragrance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_attachment" ADD CONSTRAINT "post_attachment_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_list_user_slug_idx" ON "user_list" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "user_list_user_id_idx" ON "user_list" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_list_item_list_fragrance_idx" ON "user_list_item" USING btree ("list_id","fragrance_id");--> statement-breakpoint
CREATE INDEX "user_list_item_list_id_idx" ON "user_list_item" USING btree ("list_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_follow_pair_idx" ON "user_follow" USING btree ("follower_id","following_id");--> statement-breakpoint
CREATE INDEX "user_follow_following_id_idx" ON "user_follow" USING btree ("following_id");--> statement-breakpoint
CREATE INDEX "post_author_id_created_idx" ON "post" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_recipient_created_idx" ON "notification" USING btree ("recipient_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_recipient_unread_idx" ON "notification" USING btree ("recipient_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preference_user_type_idx" ON "notification_preference" USING btree ("user_id","type");
