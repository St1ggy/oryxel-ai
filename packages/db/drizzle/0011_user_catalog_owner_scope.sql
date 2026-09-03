ALTER TABLE "brand" DROP CONSTRAINT "brand_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "brand_canonical_name_idx" ON "brand" USING btree ("name") WHERE "brand"."origin" <> 'user';--> statement-breakpoint
CREATE UNIQUE INDEX "brand_user_owner_name_idx" ON "brand" USING btree ("created_by_user_id","name") WHERE "brand"."origin" = 'user' AND "brand"."created_by_user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "fragrance_canonical_brand_name_idx" ON "fragrance" USING btree ("brand_id","name") WHERE "fragrance"."origin" <> 'user';--> statement-breakpoint
CREATE UNIQUE INDEX "fragrance_user_owner_brand_name_idx" ON "fragrance" USING btree ("created_by_user_id","brand_id","name") WHERE "fragrance"."origin" = 'user' AND "fragrance"."created_by_user_id" IS NOT NULL;