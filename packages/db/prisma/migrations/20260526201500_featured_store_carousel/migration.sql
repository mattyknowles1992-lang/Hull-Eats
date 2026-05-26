ALTER TABLE "stores"
  ADD COLUMN IF NOT EXISTS "homepage_featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "homepage_feature_order" INTEGER;

CREATE INDEX IF NOT EXISTS "stores_homepage_featured_idx"
  ON "stores"("homepage_featured", "homepage_feature_order", "created_at");
