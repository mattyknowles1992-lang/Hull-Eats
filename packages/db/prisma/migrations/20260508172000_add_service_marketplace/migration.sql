CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_business_status') THEN
    CREATE TYPE "service_business_status" AS ENUM ('pending', 'verified', 'paused', 'rejected');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "service_categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "image_url" TEXT,
  "icon" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "service_businesses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "business_name" TEXT NOT NULL,
  "owner_user_id" TEXT,
  "description" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "location" TEXT,
  "coverage_area" TEXT,
  "status" "service_business_status" NOT NULL DEFAULT 'pending',
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "service_businesses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "service_listings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "service_business_id" UUID NOT NULL,
  "category_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "price_from" DECIMAL(10, 2),
  "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "availability" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "service_listings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "service_categories_slug_key" ON "service_categories"("slug");
CREATE INDEX IF NOT EXISTS "service_categories_active_sort_order_idx" ON "service_categories"("active", "sort_order");
CREATE INDEX IF NOT EXISTS "service_businesses_owner_user_id_idx" ON "service_businesses"("owner_user_id");
CREATE INDEX IF NOT EXISTS "service_businesses_status_active_idx" ON "service_businesses"("status", "active");
CREATE INDEX IF NOT EXISTS "service_listings_category_id_active_idx" ON "service_listings"("category_id", "active");
CREATE INDEX IF NOT EXISTS "service_listings_service_business_id_active_idx" ON "service_listings"("service_business_id", "active");

ALTER TABLE "service_businesses"
  ADD CONSTRAINT "service_businesses_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "service_listings"
  ADD CONSTRAINT "service_listings_service_business_id_fkey"
  FOREIGN KEY ("service_business_id") REFERENCES "service_businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_listings"
  ADD CONSTRAINT "service_listings_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
