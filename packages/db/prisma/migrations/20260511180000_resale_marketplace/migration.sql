-- Hull Marketplace (local resale): listings, threads, messages, offers, purchases (Vinted-style flow).
-- Requires table "CustomerProfile" from Prisma (adjust FK target if your DB maps customers elsewhere).

CREATE TYPE "resale_listing_status" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'ARCHIVED');
CREATE TYPE "resale_delivery_mode" AS ENUM ('COLLECTION', 'SMALL_DELIVERY', 'VAN_REQUIRED');
CREATE TYPE "resale_offer_status" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');
CREATE TYPE "resale_purchase_status" AS ENUM ('PENDING_PAYMENT', 'PAID', 'CANCELLED', 'NOT_SOLD');
CREATE TYPE "resale_message_kind" AS ENUM ('TEXT', 'SYSTEM');

CREATE TABLE "resale_listings" (
  "id" TEXT NOT NULL,
  "seller_customer_profile_id" TEXT NOT NULL,
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

CREATE TABLE "resale_conversations" (
  "id" TEXT NOT NULL,
  "listing_id" TEXT NOT NULL,
  "buyer_customer_profile_id" TEXT NOT NULL,
  "seller_customer_profile_id" TEXT NOT NULL,
  "last_message_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "resale_conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resale_conversations_listing_id_buyer_customer_profile_id_key"
  ON "resale_conversations"("listing_id", "buyer_customer_profile_id");

CREATE TABLE "resale_messages" (
  "id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "sender_customer_profile_id" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "kind" "resale_message_kind" NOT NULL DEFAULT 'TEXT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "resale_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resale_offers" (
  "id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "offered_by_customer_profile_id" TEXT NOT NULL,
  "amount_pence" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'GBP',
  "status" "resale_offer_status" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "resale_offers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "resale_purchases" (
  "id" TEXT NOT NULL,
  "listing_id" TEXT NOT NULL,
  "conversation_id" TEXT,
  "buyer_customer_profile_id" TEXT NOT NULL,
  "amount_pence" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'GBP',
  "status" "resale_purchase_status" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "accepted_offer_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "resale_purchases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resale_purchases_accepted_offer_id_key" ON "resale_purchases"("accepted_offer_id");

CREATE INDEX "resale_listings_seller_status_idx" ON "resale_listings"("seller_customer_profile_id", "status");
CREATE INDEX "resale_listings_status_created_idx" ON "resale_listings"("status", "created_at");
CREATE INDEX "resale_conversations_buyer_last_idx" ON "resale_conversations"("buyer_customer_profile_id", "last_message_at");
CREATE INDEX "resale_conversations_seller_last_idx" ON "resale_conversations"("seller_customer_profile_id", "last_message_at");
CREATE INDEX "resale_messages_conversation_created_idx" ON "resale_messages"("conversation_id", "created_at");
CREATE INDEX "resale_offers_conversation_status_idx" ON "resale_offers"("conversation_id", "status");
CREATE INDEX "resale_purchases_listing_status_idx" ON "resale_purchases"("listing_id", "status");
CREATE INDEX "resale_purchases_buyer_status_idx" ON "resale_purchases"("buyer_customer_profile_id", "status");

ALTER TABLE "resale_listings"
  ADD CONSTRAINT "resale_listings_seller_customer_profile_id_fkey"
  FOREIGN KEY ("seller_customer_profile_id") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resale_conversations"
  ADD CONSTRAINT "resale_conversations_listing_id_fkey"
  FOREIGN KEY ("listing_id") REFERENCES "resale_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resale_conversations"
  ADD CONSTRAINT "resale_conversations_buyer_customer_profile_id_fkey"
  FOREIGN KEY ("buyer_customer_profile_id") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resale_conversations"
  ADD CONSTRAINT "resale_conversations_seller_customer_profile_id_fkey"
  FOREIGN KEY ("seller_customer_profile_id") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resale_messages"
  ADD CONSTRAINT "resale_messages_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "resale_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resale_messages"
  ADD CONSTRAINT "resale_messages_sender_customer_profile_id_fkey"
  FOREIGN KEY ("sender_customer_profile_id") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resale_offers"
  ADD CONSTRAINT "resale_offers_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "resale_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resale_offers"
  ADD CONSTRAINT "resale_offers_offered_by_customer_profile_id_fkey"
  FOREIGN KEY ("offered_by_customer_profile_id") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resale_purchases"
  ADD CONSTRAINT "resale_purchases_listing_id_fkey"
  FOREIGN KEY ("listing_id") REFERENCES "resale_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resale_purchases"
  ADD CONSTRAINT "resale_purchases_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "resale_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "resale_purchases"
  ADD CONSTRAINT "resale_purchases_buyer_customer_profile_id_fkey"
  FOREIGN KEY ("buyer_customer_profile_id") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resale_purchases"
  ADD CONSTRAINT "resale_purchases_accepted_offer_id_fkey"
  FOREIGN KEY ("accepted_offer_id") REFERENCES "resale_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
