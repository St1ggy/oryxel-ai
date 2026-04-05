-- Backfill: set existing NULLs to false before adding NOT NULL constraint
UPDATE "user_fragrance" SET "is_liked" = false WHERE "is_liked" IS NULL;
--> statement-breakpoint
ALTER TABLE "user_fragrance" ALTER COLUMN "is_liked" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "user_fragrance" ALTER COLUMN "is_liked" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_fragrance" ADD COLUMN IF NOT EXISTS "is_disliked" boolean DEFAULT false NOT NULL;
