-- Sync Supabase with schema/migrations that were baselined but never applied.
-- Safe to re-run: uses IF NOT EXISTS / DO blocks where possible.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Hull Services marketplace ───────────────────────────────────────────────
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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_businesses_owner_user_id_fkey') THEN
    ALTER TABLE "service_businesses"
      ADD CONSTRAINT "service_businesses_owner_user_id_fkey"
      FOREIGN KEY ("owner_user_id") REFERENCES "platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_listings_service_business_id_fkey') THEN
    ALTER TABLE "service_listings"
      ADD CONSTRAINT "service_listings_service_business_id_fkey"
      FOREIGN KEY ("service_business_id") REFERENCES "service_businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_listings_category_id_fkey') THEN
    ALTER TABLE "service_listings"
      ADD CONSTRAINT "service_listings_category_id_fkey"
      FOREIGN KEY ("category_id") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── Resale marketplace ──────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resale_listing_status') THEN
    CREATE TYPE "resale_listing_status" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'ARCHIVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resale_delivery_mode') THEN
    CREATE TYPE "resale_delivery_mode" AS ENUM ('COLLECTION', 'SMALL_DELIVERY', 'VAN_REQUIRED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resale_offer_status') THEN
    CREATE TYPE "resale_offer_status" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resale_purchase_status') THEN
    CREATE TYPE "resale_purchase_status" AS ENUM ('PENDING_PAYMENT', 'PAID', 'CANCELLED', 'NOT_SOLD');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resale_message_kind') THEN
    CREATE TYPE "resale_message_kind" AS ENUM ('TEXT', 'SYSTEM');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "resale_listings" (
  "id" TEXT NOT NULL,
  "seller_customer_profile_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category_slug" TEXT NOT NULL,
  "condition_label" TEXT NOT NULL,
  "price_pence" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'GBP',
  "delivery_mode" "resale_delivery_mode" NOT NULL,
  "image_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "accepts_offers" BOOLEAN NOT NULL DEFAULT true,
  "status" "resale_listing_status" NOT NULL DEFAULT 'AVAILABLE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resale_listings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "resale_conversations" (
  "id" TEXT NOT NULL,
  "listing_id" TEXT NOT NULL,
  "buyer_customer_profile_id" UUID NOT NULL,
  "seller_customer_profile_id" UUID NOT NULL,
  "last_message_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resale_conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "resale_conversations_listing_id_buyer_customer_profile_id_key"
  ON "resale_conversations"("listing_id", "buyer_customer_profile_id");

CREATE TABLE IF NOT EXISTS "resale_messages" (
  "id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "sender_customer_profile_id" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "kind" "resale_message_kind" NOT NULL DEFAULT 'TEXT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "resale_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "resale_offers" (
  "id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "offered_by_customer_profile_id" UUID NOT NULL,
  "amount_pence" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'GBP',
  "status" "resale_offer_status" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resale_offers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "resale_purchases" (
  "id" TEXT NOT NULL,
  "listing_id" TEXT NOT NULL,
  "conversation_id" TEXT,
  "buyer_customer_profile_id" UUID NOT NULL,
  "amount_pence" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'GBP',
  "status" "resale_purchase_status" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "accepted_offer_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resale_purchases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "resale_purchases_accepted_offer_id_key" ON "resale_purchases"("accepted_offer_id");
CREATE INDEX IF NOT EXISTS "resale_listings_seller_status_idx" ON "resale_listings"("seller_customer_profile_id", "status");
CREATE INDEX IF NOT EXISTS "resale_listings_status_created_idx" ON "resale_listings"("status", "created_at");
CREATE INDEX IF NOT EXISTS "resale_conversations_buyer_last_idx" ON "resale_conversations"("buyer_customer_profile_id", "last_message_at");
CREATE INDEX IF NOT EXISTS "resale_conversations_seller_last_idx" ON "resale_conversations"("seller_customer_profile_id", "last_message_at");
CREATE INDEX IF NOT EXISTS "resale_messages_conversation_created_idx" ON "resale_messages"("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "resale_offers_conversation_status_idx" ON "resale_offers"("conversation_id", "status");
CREATE INDEX IF NOT EXISTS "resale_purchases_listing_status_idx" ON "resale_purchases"("listing_id", "status");
CREATE INDEX IF NOT EXISTS "resale_purchases_buyer_status_idx" ON "resale_purchases"("buyer_customer_profile_id", "status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resale_listings_seller_customer_profile_id_fkey') THEN
    ALTER TABLE "resale_listings"
      ADD CONSTRAINT "resale_listings_seller_customer_profile_id_fkey"
      FOREIGN KEY ("seller_customer_profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resale_conversations_listing_id_fkey') THEN
    ALTER TABLE "resale_conversations"
      ADD CONSTRAINT "resale_conversations_listing_id_fkey"
      FOREIGN KEY ("listing_id") REFERENCES "resale_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resale_conversations_buyer_customer_profile_id_fkey') THEN
    ALTER TABLE "resale_conversations"
      ADD CONSTRAINT "resale_conversations_buyer_customer_profile_id_fkey"
      FOREIGN KEY ("buyer_customer_profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resale_conversations_seller_customer_profile_id_fkey') THEN
    ALTER TABLE "resale_conversations"
      ADD CONSTRAINT "resale_conversations_seller_customer_profile_id_fkey"
      FOREIGN KEY ("seller_customer_profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resale_messages_conversation_id_fkey') THEN
    ALTER TABLE "resale_messages"
      ADD CONSTRAINT "resale_messages_conversation_id_fkey"
      FOREIGN KEY ("conversation_id") REFERENCES "resale_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resale_messages_sender_customer_profile_id_fkey') THEN
    ALTER TABLE "resale_messages"
      ADD CONSTRAINT "resale_messages_sender_customer_profile_id_fkey"
      FOREIGN KEY ("sender_customer_profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resale_offers_conversation_id_fkey') THEN
    ALTER TABLE "resale_offers"
      ADD CONSTRAINT "resale_offers_conversation_id_fkey"
      FOREIGN KEY ("conversation_id") REFERENCES "resale_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resale_offers_offered_by_customer_profile_id_fkey') THEN
    ALTER TABLE "resale_offers"
      ADD CONSTRAINT "resale_offers_offered_by_customer_profile_id_fkey"
      FOREIGN KEY ("offered_by_customer_profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resale_purchases_listing_id_fkey') THEN
    ALTER TABLE "resale_purchases"
      ADD CONSTRAINT "resale_purchases_listing_id_fkey"
      FOREIGN KEY ("listing_id") REFERENCES "resale_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resale_purchases_conversation_id_fkey') THEN
    ALTER TABLE "resale_purchases"
      ADD CONSTRAINT "resale_purchases_conversation_id_fkey"
      FOREIGN KEY ("conversation_id") REFERENCES "resale_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resale_purchases_buyer_customer_profile_id_fkey') THEN
    ALTER TABLE "resale_purchases"
      ADD CONSTRAINT "resale_purchases_buyer_customer_profile_id_fkey"
      FOREIGN KEY ("buyer_customer_profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resale_purchases_accepted_offer_id_fkey') THEN
    ALTER TABLE "resale_purchases"
      ADD CONSTRAINT "resale_purchases_accepted_offer_id_fkey"
      FOREIGN KEY ("accepted_offer_id") REFERENCES "resale_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Resale reviews & resolution (from 20260511190000)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resale_resolution_status') THEN
    CREATE TYPE "resale_resolution_status" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resale_resolution_category') THEN
    CREATE TYPE "resale_resolution_category" AS ENUM (
      'ITEM_NOT_AS_DESCRIBED',
      'PAYMENT_OR_PICKUP',
      'HARASSMENT_OR_SAFETY',
      'OTHER'
    );
  END IF;
END $$;

ALTER TABLE "resale_purchases" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "resale_reviews" (
  "id" TEXT NOT NULL,
  "purchase_id" TEXT NOT NULL,
  "listing_id" TEXT NOT NULL,
  "reviewer_customer_profile_id" UUID NOT NULL,
  "rating_tenths" INTEGER NOT NULL,
  "comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "resale_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "resale_reviews_rating_tenths_check" CHECK ("rating_tenths" >= 10 AND "rating_tenths" <= 50)
);

CREATE UNIQUE INDEX IF NOT EXISTS "resale_reviews_purchase_id_key" ON "resale_reviews"("purchase_id");
CREATE INDEX IF NOT EXISTS "resale_reviews_listing_created_idx" ON "resale_reviews"("listing_id", "created_at");
CREATE INDEX IF NOT EXISTS "resale_reviews_reviewer_created_idx" ON "resale_reviews"("reviewer_customer_profile_id", "created_at");

CREATE TABLE IF NOT EXISTS "resale_resolution_cases" (
  "id" TEXT NOT NULL,
  "opened_by_customer_profile_id" UUID NOT NULL,
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

CREATE INDEX IF NOT EXISTS "resale_resolution_cases_opener_status_idx" ON "resale_resolution_cases"("opened_by_customer_profile_id", "status");
CREATE INDEX IF NOT EXISTS "resale_resolution_cases_status_created_idx" ON "resale_resolution_cases"("status", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resale_reviews_purchase_id_fkey') THEN
    ALTER TABLE "resale_reviews"
      ADD CONSTRAINT "resale_reviews_purchase_id_fkey"
      FOREIGN KEY ("purchase_id") REFERENCES "resale_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resale_reviews_listing_id_fkey') THEN
    ALTER TABLE "resale_reviews"
      ADD CONSTRAINT "resale_reviews_listing_id_fkey"
      FOREIGN KEY ("listing_id") REFERENCES "resale_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resale_reviews_reviewer_customer_profile_id_fkey') THEN
    ALTER TABLE "resale_reviews"
      ADD CONSTRAINT "resale_reviews_reviewer_customer_profile_id_fkey"
      FOREIGN KEY ("reviewer_customer_profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resale_resolution_cases_opened_by_customer_profile_id_fkey') THEN
    ALTER TABLE "resale_resolution_cases"
      ADD CONSTRAINT "resale_resolution_cases_opened_by_customer_profile_id_fkey"
      FOREIGN KEY ("opened_by_customer_profile_id") REFERENCES "customer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resale_resolution_cases_purchase_id_fkey') THEN
    ALTER TABLE "resale_resolution_cases"
      ADD CONSTRAINT "resale_resolution_cases_purchase_id_fkey"
      FOREIGN KEY ("purchase_id") REFERENCES "resale_purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'resale_resolution_cases_listing_id_fkey') THEN
    ALTER TABLE "resale_resolution_cases"
      ADD CONSTRAINT "resale_resolution_cases_listing_id_fkey"
      FOREIGN KEY ("listing_id") REFERENCES "resale_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── Prisma models without dedicated migrations ─────────────────────────────
CREATE TABLE IF NOT EXISTS "DeliveryZone" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "storeId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "postcodePatterns" TEXT[],
  "minimumOrderAmount" DECIMAL(10, 2) NOT NULL,
  "deliveryFee" DECIMAL(10, 2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryZone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MediaAsset" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "merchantId" UUID,
  "storeId" UUID,
  "url" TEXT NOT NULL,
  "altText" TEXT,
  "mimeType" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  "purpose" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MerchantMembership" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "merchantId" UUID NOT NULL,
  "role" "membership_role" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MerchantMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MerchantMembership_userId_merchantId_key" ON "MerchantMembership"("userId", "merchantId");

CREATE TABLE IF NOT EXISTS "MenuItemAvailability" (
  "id" TEXT NOT NULL,
  "menuItemId" UUID NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  CONSTRAINT "MenuItemAvailability_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DeliveryZone_storeId_fkey') THEN
    ALTER TABLE "DeliveryZone"
      ADD CONSTRAINT "DeliveryZone_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MediaAsset_merchantId_fkey') THEN
    ALTER TABLE "MediaAsset"
      ADD CONSTRAINT "MediaAsset_merchantId_fkey"
      FOREIGN KEY ("merchantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MediaAsset_storeId_fkey') THEN
    ALTER TABLE "MediaAsset"
      ADD CONSTRAINT "MediaAsset_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MerchantMembership_userId_fkey') THEN
    ALTER TABLE "MerchantMembership"
      ADD CONSTRAINT "MerchantMembership_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MerchantMembership_merchantId_fkey') THEN
    ALTER TABLE "MerchantMembership"
      ADD CONSTRAINT "MerchantMembership_merchantId_fkey"
      FOREIGN KEY ("merchantId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MenuItemAvailability_menuItemId_fkey') THEN
    ALTER TABLE "MenuItemAvailability"
      ADD CONSTRAINT "MenuItemAvailability_menuItemId_fkey"
      FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_delivery_zone_id_fkey') THEN
    ALTER TABLE "orders"
      ADD CONSTRAINT "orders_delivery_zone_id_fkey"
      FOREIGN KEY ("delivery_zone_id") REFERENCES "DeliveryZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'menu_items_primary_image_asset_id_fkey') THEN
    ALTER TABLE "menu_items"
      ADD CONSTRAINT "menu_items_primary_image_asset_id_fkey"
      FOREIGN KEY ("primary_image_asset_id") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
