ALTER TABLE "businesses"
ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deleted_restore_snapshot" JSONB;

CREATE INDEX IF NOT EXISTS "businesses_deleted_at_idx" ON "businesses"("deleted_at");
