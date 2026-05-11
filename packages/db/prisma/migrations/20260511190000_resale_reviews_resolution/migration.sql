-- Buyer reviews (1.0–5.0 in 0.1 steps, stored as tenths 10–50), resolution centre cases, purchase paid timestamp.

ALTER TABLE "resale_purchases" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);

CREATE TYPE "resale_resolution_status" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "resale_resolution_category" AS ENUM (
  'ITEM_NOT_AS_DESCRIBED',
  'PAYMENT_OR_PICKUP',
  'HARASSMENT_OR_SAFETY',
  'OTHER'
);

CREATE TABLE "resale_reviews" (
  "id" TEXT NOT NULL,
  "purchase_id" TEXT NOT NULL,
  "listing_id" TEXT NOT NULL,
  "reviewer_customer_profile_id" TEXT NOT NULL,
  "rating_tenths" INTEGER NOT NULL,
  "comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "resale_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "resale_reviews_rating_tenths_check" CHECK ("rating_tenths" >= 10 AND "rating_tenths" <= 50)
);

CREATE UNIQUE INDEX "resale_reviews_purchase_id_key" ON "resale_reviews"("purchase_id");
CREATE INDEX "resale_reviews_listing_created_idx" ON "resale_reviews"("listing_id", "created_at");
CREATE INDEX "resale_reviews_reviewer_created_idx" ON "resale_reviews"("reviewer_customer_profile_id", "created_at");

CREATE TABLE "resale_resolution_cases" (
  "id" TEXT NOT NULL,
  "opened_by_customer_profile_id" TEXT NOT NULL,
  "purchase_id" TEXT,
  "listing_id" TEXT,
  "category" "resale_resolution_category" NOT NULL,
  "summary" TEXT NOT NULL,
  "details" TEXT NOT NULL,
  "status" "resale_resolution_status" NOT NULL DEFAULT 'OPEN',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "resale_resolution_cases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "resale_resolution_cases_opener_status_idx" ON "resale_resolution_cases"("opened_by_customer_profile_id", "status");
CREATE INDEX "resale_resolution_cases_status_created_idx" ON "resale_resolution_cases"("status", "created_at");

ALTER TABLE "resale_reviews"
  ADD CONSTRAINT "resale_reviews_purchase_id_fkey"
  FOREIGN KEY ("purchase_id") REFERENCES "resale_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resale_reviews"
  ADD CONSTRAINT "resale_reviews_listing_id_fkey"
  FOREIGN KEY ("listing_id") REFERENCES "resale_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resale_reviews"
  ADD CONSTRAINT "resale_reviews_reviewer_customer_profile_id_fkey"
  FOREIGN KEY ("reviewer_customer_profile_id") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resale_resolution_cases"
  ADD CONSTRAINT "resale_resolution_cases_opened_by_customer_profile_id_fkey"
  FOREIGN KEY ("opened_by_customer_profile_id") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resale_resolution_cases"
  ADD CONSTRAINT "resale_resolution_cases_purchase_id_fkey"
  FOREIGN KEY ("purchase_id") REFERENCES "resale_purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "resale_resolution_cases"
  ADD CONSTRAINT "resale_resolution_cases_listing_id_fkey"
  FOREIGN KEY ("listing_id") REFERENCES "resale_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
