ALTER TABLE "user_ai_preferences" ADD COLUMN "system_prompt_mode" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_ai_preferences" ADD COLUMN "system_prompt_append" text;--> statement-breakpoint
ALTER TABLE "user_ai_preferences" ADD COLUMN "system_prompt_replace" text;
