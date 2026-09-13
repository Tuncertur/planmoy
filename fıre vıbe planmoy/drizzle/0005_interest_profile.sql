CREATE TABLE IF NOT EXISTS "user_interests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "kind" text DEFAULT 'hobi' NOT NULL,
  "intensity" text DEFAULT 'merak ediyorum' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_location_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL UNIQUE,
  "label" text NOT NULL,
  "latitude" text,
  "longitude" text,
  "radius_km" integer DEFAULT 30 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_interests_user_id_user_id_fk') THEN
    ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_location_preferences_user_id_user_id_fk') THEN
    ALTER TABLE "user_location_preferences" ADD CONSTRAINT "user_location_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade;
  END IF;
END $$;