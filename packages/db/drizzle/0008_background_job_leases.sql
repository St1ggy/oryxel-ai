ALTER TABLE "background_job" ADD COLUMN "lease_token" uuid;--> statement-breakpoint
ALTER TABLE "background_job" ADD COLUMN "lease_expires_at" timestamp with time zone;--> statement-breakpoint
UPDATE "background_job"
SET
	"status" = 'failed',
	"error_message" = 'Worker stopped during background-job lease migration',
	"completed_at" = now()
WHERE "status" = 'processing';--> statement-breakpoint
CREATE INDEX "background_job_pending_claim_idx" ON "background_job" USING btree ("created_at","id") WHERE "background_job"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "background_job_processing_lease_idx" ON "background_job" USING btree ("lease_expires_at","id") WHERE "background_job"."status" = 'processing';--> statement-breakpoint
ALTER TABLE "background_job" ADD CONSTRAINT "background_job_processing_lease_check" CHECK (("background_job"."status" = 'processing' AND "background_job"."lease_token" IS NOT NULL AND "background_job"."lease_expires_at" IS NOT NULL) OR ("background_job"."status" <> 'processing' AND "background_job"."lease_token" IS NULL AND "background_job"."lease_expires_at" IS NULL)) NOT VALID;
