CREATE TABLE IF NOT EXISTS "events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "kind" text NOT NULL DEFAULT 'Diğer',
  "description" text,
  "location" text NOT NULL,
  "starts_at" timestamptz NOT NULL,
  "share_token" text NOT NULL UNIQUE,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS "event_participants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "user_id" text REFERENCES "user"("id") ON DELETE CASCADE,
  "email" text,
  "display_name" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_participants_event_id_idx" ON "event_participants" ("event_id");
