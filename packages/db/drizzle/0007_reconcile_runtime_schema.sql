-- Earlier snapshots recorded these objects before a matching SQL migration existed.
-- IF NOT EXISTS keeps reconciliation safe for environments that received them via drizzle-kit push.
ALTER TABLE "user_profile" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_ai_preferences" ADD COLUMN IF NOT EXISTS "graph_style" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_agent_memory" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"source" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_agent_memory_user_id_idx" ON "user_agent_memory" USING btree ("user_id");--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'user_profile'
			AND column_name = 'onboarding_completed_at'
			AND data_type = 'timestamp with time zone'
			AND is_nullable = 'YES'
			AND column_default IS NULL
	) THEN
		RAISE EXCEPTION 'user_profile.onboarding_completed_at has an unexpected definition';
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'user_ai_preferences'
			AND column_name = 'graph_style'
			AND data_type = 'text'
			AND is_nullable = 'NO'
			AND column_default = '''default''::text'
	) THEN
		RAISE EXCEPTION 'user_ai_preferences.graph_style has an unexpected definition';
	END IF;

	IF (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_agent_memory') <> 6
		OR NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = 'user_agent_memory'
				AND column_name = 'id' AND data_type = 'integer' AND is_nullable = 'NO'
				AND column_default = 'nextval(''user_agent_memory_id_seq''::regclass)'
		)
		OR NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = 'user_agent_memory'
				AND column_name = 'user_id' AND data_type = 'text' AND is_nullable = 'NO' AND column_default IS NULL
		)
		OR NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = 'user_agent_memory'
				AND column_name = 'content' AND data_type = 'text' AND is_nullable = 'NO' AND column_default IS NULL
		)
		OR NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = 'user_agent_memory'
				AND column_name = 'source' AND data_type = 'text' AND is_nullable = 'NO'
				AND column_default = '''user''::text'
		)
		OR NOT EXISTS (
			SELECT 1 FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = 'user_agent_memory'
				AND column_name IN ('created_at', 'updated_at') AND data_type = 'timestamp with time zone'
				AND is_nullable = 'NO' AND column_default = 'now()'
			GROUP BY table_name
			HAVING count(*) = 2
		)
	THEN
		RAISE EXCEPTION 'user_agent_memory has an unexpected definition';
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conrelid = 'public.user_agent_memory'::regclass
			AND contype = 'p'
			AND pg_get_constraintdef(oid) = 'PRIMARY KEY (id)'
	) THEN
		RAISE EXCEPTION 'user_agent_memory primary key is missing or invalid';
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_indexes
		WHERE schemaname = 'public'
			AND tablename = 'user_agent_memory'
			AND indexname = 'user_agent_memory_user_id_idx'
			AND indexdef LIKE '%USING btree (user_id)%'
	) THEN
		RAISE EXCEPTION 'user_agent_memory_user_id_idx is missing or invalid';
	END IF;
END $$;
