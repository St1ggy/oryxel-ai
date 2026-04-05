-- Step 1: add is_disliked as nullable so we can populate it first
ALTER TABLE "user_fragrance" ADD COLUMN IF NOT EXISTS "is_disliked" boolean;
--> statement-breakpoint

-- Step 2: derive is_disliked from old is_liked semantics
--   old: is_tried=true, is_liked=false  → disliked
--   old: is_tried=true, is_liked=null   → neutral (not rated)
--   old: is_tried=true, is_liked=true   → liked
-- Use IS TRUE / IS FALSE so NULL-valued is_liked doesn't propagate NULL.
UPDATE "user_fragrance"
  SET "is_disliked" = (is_tried IS TRUE AND is_liked IS FALSE)
  WHERE "is_disliked" IS NULL;
--> statement-breakpoint

-- Step 3: make is_disliked NOT NULL with default false
ALTER TABLE "user_fragrance" ALTER COLUMN "is_disliked" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "user_fragrance" ALTER COLUMN "is_disliked" SET NOT NULL;
--> statement-breakpoint

-- Step 4: backfill is_liked NULLs → false (neutral entries that were never rated)
UPDATE "user_fragrance" SET "is_liked" = false WHERE "is_liked" IS NULL;
--> statement-breakpoint

-- Step 5: make is_liked NOT NULL with default false
ALTER TABLE "user_fragrance" ALTER COLUMN "is_liked" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "user_fragrance" ALTER COLUMN "is_liked" SET NOT NULL;
