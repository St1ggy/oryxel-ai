SET LOCAL lock_timeout = '10s';--> statement-breakpoint
ALTER TABLE "ai_patch_audit_log" DROP CONSTRAINT "ai_patch_audit_log_patch_id_ai_pending_patch_id_fk";
--> statement-breakpoint
ALTER TABLE "user_list_item" DROP CONSTRAINT "user_list_item_user_fragrance_id_user_fragrance_id_fk";
--> statement-breakpoint
CREATE INDEX "ai_patch_audit_log_user_id_idx" ON "ai_patch_audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_patch_audit_log_patch_id_idx" ON "ai_patch_audit_log" USING btree ("patch_id");--> statement-breakpoint
CREATE INDEX "ai_pending_patch_user_id_idx" ON "ai_pending_patch" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "background_job_user_id_idx" ON "background_job" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_actor_id_idx" ON "notification" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "post_attachment_post_id_idx" ON "post_attachment" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "user_activity_log_user_id_idx" ON "user_activity_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_chat_message_user_id_idx" ON "user_chat_message" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_list_item_user_fragrance_id_idx" ON "user_list_item" USING btree ("user_fragrance_id");--> statement-breakpoint
ALTER TABLE "ai_patch_audit_log" ADD CONSTRAINT "ai_patch_audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "ai_patch_audit_log" ADD CONSTRAINT "ai_patch_audit_log_patch_id_ai_pending_patch_id_fk" FOREIGN KEY ("patch_id") REFERENCES "public"."ai_pending_patch"("id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "ai_pending_patch" ADD CONSTRAINT "ai_pending_patch_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "ai_recommendation_dismissed" ADD CONSTRAINT "ai_recommendation_dismissed_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "background_job" ADD CONSTRAINT "background_job_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "user_activity_log" ADD CONSTRAINT "user_activity_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "user_agent_memory" ADD CONSTRAINT "user_agent_memory_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "user_ai_preferences" ADD CONSTRAINT "user_ai_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "user_ai_provider_key" ADD CONSTRAINT "user_ai_provider_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "user_chat_message" ADD CONSTRAINT "user_chat_message_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "user_follow" ADD CONSTRAINT "user_follow_follower_id_user_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "user_follow" ADD CONSTRAINT "user_follow_following_id_user_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "user_fragrance" ADD CONSTRAINT "user_fragrance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "user_list" ADD CONSTRAINT "user_list_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "user_list_item" ADD CONSTRAINT "user_list_item_user_fragrance_id_user_fragrance_id_fk" FOREIGN KEY ("user_fragrance_id") REFERENCES "public"."user_fragrance"("id") ON DELETE set null ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action NOT VALID;--> statement-breakpoint
DELETE FROM "notification"
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "notification"."recipient_id")
	OR ("actor_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "notification"."actor_id"));--> statement-breakpoint
DELETE FROM "notification_preference"
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "notification_preference"."user_id");--> statement-breakpoint
DELETE FROM "post"
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "post"."author_id");--> statement-breakpoint
DELETE FROM "user_list"
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "user_list"."user_id");--> statement-breakpoint
UPDATE "user_list_item"
SET "user_fragrance_id" = NULL
WHERE "user_fragrance_id" IN (
	SELECT "user_fragrance"."id"
	FROM "user_fragrance"
	WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "user_fragrance"."user_id")
);--> statement-breakpoint
DELETE FROM "user_follow"
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "user_follow"."follower_id")
	OR NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "user_follow"."following_id");--> statement-breakpoint
DELETE FROM "ai_patch_audit_log"
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "ai_patch_audit_log"."user_id")
	OR EXISTS (
		SELECT 1
		FROM "ai_pending_patch"
		WHERE "ai_pending_patch"."id" = "ai_patch_audit_log"."patch_id"
			AND NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "ai_pending_patch"."user_id")
	);--> statement-breakpoint
DELETE FROM "ai_pending_patch"
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "ai_pending_patch"."user_id");--> statement-breakpoint
DELETE FROM "ai_recommendation_dismissed"
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "ai_recommendation_dismissed"."user_id");--> statement-breakpoint
DELETE FROM "background_job"
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "background_job"."user_id");--> statement-breakpoint
DELETE FROM "user_activity_log"
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "user_activity_log"."user_id");--> statement-breakpoint
DELETE FROM "user_agent_memory"
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "user_agent_memory"."user_id");--> statement-breakpoint
DELETE FROM "user_ai_preferences"
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "user_ai_preferences"."user_id");--> statement-breakpoint
DELETE FROM "user_ai_provider_key"
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "user_ai_provider_key"."user_id");--> statement-breakpoint
DELETE FROM "user_chat_message"
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "user_chat_message"."user_id");--> statement-breakpoint
DELETE FROM "user_fragrance"
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "user_fragrance"."user_id");--> statement-breakpoint
DELETE FROM "user_profile"
WHERE NOT EXISTS (SELECT 1 FROM "user" WHERE "user"."id" = "user_profile"."user_id");--> statement-breakpoint
ALTER TABLE "ai_patch_audit_log" VALIDATE CONSTRAINT "ai_patch_audit_log_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "ai_patch_audit_log" VALIDATE CONSTRAINT "ai_patch_audit_log_patch_id_ai_pending_patch_id_fk";--> statement-breakpoint
ALTER TABLE "ai_pending_patch" VALIDATE CONSTRAINT "ai_pending_patch_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "ai_recommendation_dismissed" VALIDATE CONSTRAINT "ai_recommendation_dismissed_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "background_job" VALIDATE CONSTRAINT "background_job_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "notification" VALIDATE CONSTRAINT "notification_recipient_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "notification" VALIDATE CONSTRAINT "notification_actor_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "notification_preference" VALIDATE CONSTRAINT "notification_preference_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "post" VALIDATE CONSTRAINT "post_author_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "user_activity_log" VALIDATE CONSTRAINT "user_activity_log_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "user_agent_memory" VALIDATE CONSTRAINT "user_agent_memory_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "user_ai_preferences" VALIDATE CONSTRAINT "user_ai_preferences_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "user_ai_provider_key" VALIDATE CONSTRAINT "user_ai_provider_key_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "user_chat_message" VALIDATE CONSTRAINT "user_chat_message_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "user_follow" VALIDATE CONSTRAINT "user_follow_follower_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "user_follow" VALIDATE CONSTRAINT "user_follow_following_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "user_fragrance" VALIDATE CONSTRAINT "user_fragrance_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "user_list" VALIDATE CONSTRAINT "user_list_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "user_list_item" VALIDATE CONSTRAINT "user_list_item_user_fragrance_id_user_fragrance_id_fk";--> statement-breakpoint
ALTER TABLE "user_profile" VALIDATE CONSTRAINT "user_profile_user_id_user_id_fk";
