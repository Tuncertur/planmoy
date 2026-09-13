ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'Kişisel görevler' NOT NULL;
