ALTER TABLE "user_ai_preferences" ADD COLUMN "default_chat_mode" text DEFAULT 'agent' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_ai_preferences" ADD COLUMN "default_model_id" text;