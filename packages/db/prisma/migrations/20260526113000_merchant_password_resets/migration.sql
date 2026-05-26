ALTER TABLE "hub_users"
ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "hub_users"
ADD COLUMN IF NOT EXISTS "session_version" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "hub_password_reset_challenges" (
  "id" TEXT NOT NULL,
  "hub_user_id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "verified_at" TIMESTAMP(3),
  "consumed_at" TIMESTAMP(3),
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "last_attempt_at" TIMESTAMP(3),
  "requested_ip" TEXT,
  "requested_user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "hub_password_reset_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "hub_password_reset_challenges_hub_user_id_created_at_idx"
  ON "hub_password_reset_challenges"("hub_user_id", "created_at");

CREATE INDEX IF NOT EXISTS "hub_password_reset_challenges_email_created_at_idx"
  ON "hub_password_reset_challenges"("email", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hub_password_reset_challenges_hub_user_id_fkey'
  ) THEN
    ALTER TABLE "hub_password_reset_challenges"
      ADD CONSTRAINT "hub_password_reset_challenges_hub_user_id_fkey"
      FOREIGN KEY ("hub_user_id") REFERENCES "hub_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
