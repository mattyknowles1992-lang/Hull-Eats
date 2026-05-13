-- Hub-configured delivery: mile bands, postcode districts, radius (JSON on stores).

ALTER TABLE "stores"
ADD COLUMN IF NOT EXISTS "delivery_config" JSONB;
