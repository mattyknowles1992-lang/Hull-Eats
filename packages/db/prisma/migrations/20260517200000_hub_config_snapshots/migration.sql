-- Named hub workspace backups (settings + menu) for merchant revert — max 5 per store enforced in API.

CREATE TABLE IF NOT EXISTS "hub_config_snapshots" (
    "id" TEXT NOT NULL,
    "store_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hub_config_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "hub_config_snapshots_store_id_created_at_idx" ON "hub_config_snapshots"("store_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hub_config_snapshots_store_id_fkey'
  ) THEN
    ALTER TABLE "hub_config_snapshots"
      ADD CONSTRAINT "hub_config_snapshots_store_id_fkey"
      FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
