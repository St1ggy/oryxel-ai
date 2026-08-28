CREATE TYPE "public"."candidate_origin" AS ENUM('ai', 'human');--> statement-breakpoint
CREATE TYPE "public"."candidate_status" AS ENUM('pending', 'accepted', 'rejected', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."catalog_entity_type" AS ENUM('brand', 'perfume');--> statement-breakpoint
CREATE TYPE "public"."catalog_locale" AS ENUM('en', 'es', 'fr', 'ja', 'ru', 'zh');--> statement-breakpoint
CREATE TYPE "public"."import_batch_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."import_item_status" AS ENUM('pending', 'imported', 'rejected', 'failed');--> statement-breakpoint
CREATE TYPE "public"."moderation_decision" AS ENUM('accept', 'reject', 'request_changes');--> statement-breakpoint
CREATE TABLE "brand_alias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"locale" "catalog_locale" NOT NULL,
	"alias" text NOT NULL,
	"normalized_alias" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"canonical_name" text NOT NULL,
	"country_code" text,
	"founded_year" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"change_note" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brand_revision_positive_check" CHECK ("brand_revision"."revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "brand" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retired_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "catalog_outbox" (
	"sequence" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "catalog_outbox_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"event_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"aggregate_type" "catalog_entity_type" NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"revision_id" uuid,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	CONSTRAINT "catalog_outbox_event_id_unique" UNIQUE("event_id"),
	CONSTRAINT "catalog_outbox_attempts_nonnegative_check" CHECK ("catalog_outbox"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "fact_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"import_item_id" uuid,
	"brand_revision_id" uuid,
	"perfume_revision_id" uuid,
	"field_key" text NOT NULL,
	"locale" "catalog_locale",
	"source_record_id" text,
	"source_url" text,
	"excerpt" text,
	"value" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"license_snapshot" jsonb NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fact_evidence_one_revision_check" CHECK (num_nonnulls("fact_evidence"."brand_revision_id", "fact_evidence"."perfume_revision_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "import_batch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_key" text NOT NULL,
	"status" "import_batch_status" DEFAULT 'pending' NOT NULL,
	"requested_by" text NOT NULL,
	"statistics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "import_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"source_record_id" text NOT NULL,
	"entity_type" "catalog_entity_type" NOT NULL,
	"status" "import_item_status" DEFAULT 'pending' NOT NULL,
	"payload" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"brand_id" uuid,
	"perfume_id" uuid,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "import_item_sequence_nonnegative_check" CHECK ("import_item"."sequence" >= 0),
	CONSTRAINT "import_item_entity_target_check" CHECK (("import_item"."entity_type" = 'brand' AND "import_item"."perfume_id" IS NULL) OR ("import_item"."entity_type" = 'perfume'))
);
--> statement-breakpoint
CREATE TABLE "licensed_source" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"display_name" text NOT NULL,
	"license_name" text NOT NULL,
	"license_url" text,
	"terms_url" text,
	"attribution_text" text,
	"allows_ai_use" boolean DEFAULT false NOT NULL,
	"allows_commercial_use" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "licensed_source_source_key_unique" UNIQUE("source_key")
);
--> statement-breakpoint
CREATE TABLE "localized_candidate_evidence" (
	"candidate_id" uuid NOT NULL,
	"evidence_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "localized_field_candidate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_revision_id" uuid,
	"perfume_revision_id" uuid,
	"field_key" text NOT NULL,
	"locale" "catalog_locale" NOT NULL,
	"value" text NOT NULL,
	"origin" "candidate_origin" NOT NULL,
	"status" "candidate_status" DEFAULT 'pending' NOT NULL,
	"confidence" numeric(5, 4),
	"ai_provider" text,
	"ai_model" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "localized_candidate_one_revision_check" CHECK (num_nonnulls("localized_field_candidate"."brand_revision_id", "localized_field_candidate"."perfume_revision_id") = 1),
	CONSTRAINT "localized_candidate_confidence_check" CHECK ("localized_field_candidate"."confidence" IS NULL OR ("localized_field_candidate"."confidence" >= 0 AND "localized_field_candidate"."confidence" <= 1)),
	CONSTRAINT "localized_candidate_ai_metadata_check" CHECK ("localized_field_candidate"."origin" = 'human' OR ("localized_field_candidate"."ai_provider" IS NOT NULL AND "localized_field_candidate"."ai_model" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "moderation_audit_event" (
	"sequence" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "moderation_audit_event_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"event_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_audit_event_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "moderation_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"decision" "moderation_decision" NOT NULL,
	"reviewer_id" text NOT NULL,
	"rationale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perfume_alias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"perfume_id" uuid NOT NULL,
	"locale" "catalog_locale" NOT NULL,
	"alias" text NOT NULL,
	"normalized_alias" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perfume_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"perfume_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"brand_id" uuid NOT NULL,
	"canonical_name" text NOT NULL,
	"release_year" integer,
	"concentration" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"change_note" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "perfume_revision_positive_check" CHECK ("perfume_revision"."revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "perfume" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retired_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "brand_alias" ADD CONSTRAINT "brand_alias_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_revision" ADD CONSTRAINT "brand_revision_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_evidence" ADD CONSTRAINT "fact_evidence_source_id_licensed_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."licensed_source"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_evidence" ADD CONSTRAINT "fact_evidence_import_item_id_import_item_id_fk" FOREIGN KEY ("import_item_id") REFERENCES "public"."import_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_evidence" ADD CONSTRAINT "fact_evidence_brand_revision_id_brand_revision_id_fk" FOREIGN KEY ("brand_revision_id") REFERENCES "public"."brand_revision"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fact_evidence" ADD CONSTRAINT "fact_evidence_perfume_revision_id_perfume_revision_id_fk" FOREIGN KEY ("perfume_revision_id") REFERENCES "public"."perfume_revision"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batch" ADD CONSTRAINT "import_batch_source_id_licensed_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."licensed_source"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_item" ADD CONSTRAINT "import_item_batch_id_import_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_item" ADD CONSTRAINT "import_item_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_item" ADD CONSTRAINT "import_item_perfume_id_perfume_id_fk" FOREIGN KEY ("perfume_id") REFERENCES "public"."perfume"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "localized_candidate_evidence" ADD CONSTRAINT "localized_candidate_evidence_candidate_id_localized_field_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."localized_field_candidate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "localized_candidate_evidence" ADD CONSTRAINT "localized_candidate_evidence_evidence_id_fact_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."fact_evidence"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "localized_field_candidate" ADD CONSTRAINT "localized_field_candidate_brand_revision_id_brand_revision_id_fk" FOREIGN KEY ("brand_revision_id") REFERENCES "public"."brand_revision"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "localized_field_candidate" ADD CONSTRAINT "localized_field_candidate_perfume_revision_id_perfume_revision_id_fk" FOREIGN KEY ("perfume_revision_id") REFERENCES "public"."perfume_revision"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_audit_event" ADD CONSTRAINT "moderation_audit_event_review_id_moderation_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."moderation_review"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_review" ADD CONSTRAINT "moderation_review_candidate_id_localized_field_candidate_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."localized_field_candidate"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfume_alias" ADD CONSTRAINT "perfume_alias_perfume_id_perfume_id_fk" FOREIGN KEY ("perfume_id") REFERENCES "public"."perfume"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfume_revision" ADD CONSTRAINT "perfume_revision_perfume_id_perfume_id_fk" FOREIGN KEY ("perfume_id") REFERENCES "public"."perfume"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfume_revision" ADD CONSTRAINT "perfume_revision_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brand_alias_target_locale_value_idx" ON "brand_alias" USING btree ("brand_id","locale","normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_revision_brand_number_idx" ON "brand_revision" USING btree ("brand_id","revision");--> statement-breakpoint
CREATE INDEX "brand_revision_brand_created_idx" ON "brand_revision" USING btree ("brand_id","created_at");--> statement-breakpoint
CREATE INDEX "catalog_outbox_pending_idx" ON "catalog_outbox" USING btree ("sequence") WHERE "catalog_outbox"."published_at" IS NULL;--> statement-breakpoint
CREATE INDEX "catalog_outbox_aggregate_idx" ON "catalog_outbox" USING btree ("aggregate_type","aggregate_id","sequence");--> statement-breakpoint
CREATE INDEX "fact_evidence_source_record_idx" ON "fact_evidence" USING btree ("source_id","source_record_id");--> statement-breakpoint
CREATE INDEX "fact_evidence_brand_revision_idx" ON "fact_evidence" USING btree ("brand_revision_id");--> statement-breakpoint
CREATE INDEX "fact_evidence_perfume_revision_idx" ON "fact_evidence" USING btree ("perfume_revision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_batch_source_external_idx" ON "import_batch" USING btree ("source_id","external_key");--> statement-breakpoint
CREATE INDEX "import_batch_status_created_idx" ON "import_batch" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "import_item_batch_sequence_idx" ON "import_item" USING btree ("batch_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "import_item_batch_source_record_idx" ON "import_item" USING btree ("batch_id","source_record_id");--> statement-breakpoint
CREATE INDEX "import_item_batch_status_idx" ON "import_item" USING btree ("batch_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "localized_candidate_evidence_pair_idx" ON "localized_candidate_evidence" USING btree ("candidate_id","evidence_id");--> statement-breakpoint
CREATE INDEX "localized_candidate_moderation_queue_idx" ON "localized_field_candidate" USING btree ("status","locale","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "localized_candidate_accepted_brand_idx" ON "localized_field_candidate" USING btree ("brand_revision_id","field_key","locale") WHERE "localized_field_candidate"."status" = 'accepted' AND "localized_field_candidate"."brand_revision_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "localized_candidate_accepted_perfume_idx" ON "localized_field_candidate" USING btree ("perfume_revision_id","field_key","locale") WHERE "localized_field_candidate"."status" = 'accepted' AND "localized_field_candidate"."perfume_revision_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "moderation_audit_target_idx" ON "moderation_audit_event" USING btree ("target_type","target_id","sequence");--> statement-breakpoint
CREATE INDEX "moderation_review_candidate_created_idx" ON "moderation_review" USING btree ("candidate_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "perfume_alias_target_locale_value_idx" ON "perfume_alias" USING btree ("perfume_id","locale","normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "perfume_revision_perfume_number_idx" ON "perfume_revision" USING btree ("perfume_id","revision");--> statement-breakpoint
CREATE INDEX "perfume_revision_perfume_created_idx" ON "perfume_revision" USING btree ("perfume_id","created_at");--> statement-breakpoint
CREATE INDEX "perfume_revision_brand_idx" ON "perfume_revision" USING btree ("brand_id");--> statement-breakpoint
CREATE FUNCTION "prevent_catalog_record_mutation"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION '% records are append-only', TG_TABLE_NAME;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "brand_revision_immutable"
BEFORE UPDATE OR DELETE ON "brand_revision"
FOR EACH ROW EXECUTE FUNCTION "prevent_catalog_record_mutation"();--> statement-breakpoint
CREATE TRIGGER "perfume_revision_immutable"
BEFORE UPDATE OR DELETE ON "perfume_revision"
FOR EACH ROW EXECUTE FUNCTION "prevent_catalog_record_mutation"();--> statement-breakpoint
CREATE TRIGGER "fact_evidence_immutable"
BEFORE UPDATE OR DELETE ON "fact_evidence"
FOR EACH ROW EXECUTE FUNCTION "prevent_catalog_record_mutation"();--> statement-breakpoint
CREATE TRIGGER "moderation_review_immutable"
BEFORE UPDATE OR DELETE ON "moderation_review"
FOR EACH ROW EXECUTE FUNCTION "prevent_catalog_record_mutation"();--> statement-breakpoint
CREATE TRIGGER "moderation_audit_event_immutable"
BEFORE UPDATE OR DELETE ON "moderation_audit_event"
FOR EACH ROW EXECUTE FUNCTION "prevent_catalog_record_mutation"();--> statement-breakpoint
CREATE FUNCTION "protect_catalog_outbox_sequence"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	IF NEW."sequence" IS DISTINCT FROM OLD."sequence" THEN
		RAISE EXCEPTION 'catalog_outbox.sequence is immutable';
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "catalog_outbox_sequence_immutable"
BEFORE UPDATE ON "catalog_outbox"
FOR EACH ROW EXECUTE FUNCTION "protect_catalog_outbox_sequence"();
