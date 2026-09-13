ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "cancellation_reason" text;
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE TABLE IF NOT EXISTS "appointment_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "appointment_id" uuid NOT NULL REFERENCES "appointments"("id") ON DELETE cascade,
  "author_id" text REFERENCES "user"("id") ON DELETE cascade,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "moderation_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text REFERENCES "user"("id") ON DELETE cascade,
  "surface" text NOT NULL,
  "action" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
