-- Weekly opening hours per store (merchant live driver map gating).

CREATE TABLE IF NOT EXISTS "store_hours" (
    "id" TEXT NOT NULL,
    "store_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "open_time" TEXT NOT NULL,
    "close_time" TEXT NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "store_hours_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "store_hours_store_id_idx" ON "store_hours"("store_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_hours_store_id_fkey'
  ) THEN
    ALTER TABLE "store_hours"
      ADD CONSTRAINT "store_hours_store_id_fkey"
      FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
