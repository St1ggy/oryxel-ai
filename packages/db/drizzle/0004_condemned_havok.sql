CREATE TABLE "ai_recommendation_dismissed" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"fragrance_id" integer NOT NULL,
	"reason" text,
	"dismissed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_recommendation_dismissed" ADD CONSTRAINT "ai_recommendation_dismissed_fragrance_id_fragrance_id_fk" FOREIGN KEY ("fragrance_id") REFERENCES "public"."fragrance"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_rec_dismissed_user_frag" ON "ai_recommendation_dismissed" USING btree ("user_id","fragrance_id");