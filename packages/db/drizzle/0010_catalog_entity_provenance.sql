ALTER TABLE "brand" ADD COLUMN "origin" text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "brand" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "fragrance" ADD COLUMN "origin" text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "fragrance" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
ALTER TABLE "user_fragrance" ADD COLUMN "notes_summary" text;--> statement-breakpoint
ALTER TABLE "user_fragrance" ADD COLUMN "pyramid_top" text;--> statement-breakpoint
ALTER TABLE "user_fragrance" ADD COLUMN "pyramid_mid" text;--> statement-breakpoint
ALTER TABLE "user_fragrance" ADD COLUMN "pyramid_base" text;--> statement-breakpoint
ALTER TABLE "brand" ADD CONSTRAINT "brand_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fragrance" ADD CONSTRAINT "fragrance_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_rec_dismissed_fragrance_id_idx" ON "ai_recommendation_dismissed" USING btree ("fragrance_id");--> statement-breakpoint
CREATE INDEX "brand_origin_idx" ON "brand" USING btree ("origin");--> statement-breakpoint
CREATE INDEX "brand_created_by_user_id_idx" ON "brand" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "fragrance_origin_idx" ON "fragrance" USING btree ("origin");--> statement-breakpoint
CREATE INDEX "fragrance_brand_id_idx" ON "fragrance" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "fragrance_created_by_user_id_idx" ON "fragrance" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "post_attachment_kind_entity_id_idx" ON "post_attachment" USING btree ("kind","entity_id");--> statement-breakpoint
CREATE INDEX "user_fragrance_fragrance_id_idx" ON "user_fragrance" USING btree ("fragrance_id");--> statement-breakpoint
CREATE INDEX "user_list_item_fragrance_id_idx" ON "user_list_item" USING btree ("fragrance_id");--> statement-breakpoint
ALTER TABLE "brand" ADD CONSTRAINT "brand_origin_check" CHECK ("brand"."origin" IN ('legacy', 'catalog', 'user'));--> statement-breakpoint
ALTER TABLE "fragrance" ADD CONSTRAINT "fragrance_origin_check" CHECK ("fragrance"."origin" IN ('legacy', 'catalog', 'user'));
