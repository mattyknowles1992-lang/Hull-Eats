-- Hub/store promotional offers (merchant-configured). Used by merchant portal and future checkout.

CREATE TYPE "store_promotion_kind" AS ENUM ('BOGO_ITEM', 'PERCENT_OFF', 'FIXED_AMOUNT_ITEM', 'BUNDLE_FIXED_PRICE');
CREATE TYPE "store_promotion_scope" AS ENUM ('ITEMS', 'CATEGORIES', 'WHOLE_MENU');

CREATE TABLE "store_promotions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "store_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "kind" "store_promotion_kind" NOT NULL,
  "scope" "store_promotion_scope" NOT NULL,
  "percent_off" DECIMAL(5, 2),
  "fixed_amount_off" DECIMAL(10, 2),
  "bundle_fixed_price" DECIMAL(10, 2),
  "menu_item_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "category_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "bundle_lines" JSONB,
  "valid_dates" TEXT[] NOT NULL,
  "daily_start_time" TEXT,
  "daily_end_time" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "store_promotions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "store_promotions_store_id_idx" ON "store_promotions"("store_id");

ALTER TABLE "store_promotions"
  ADD CONSTRAINT "store_promotions_store_id_fkey"
  FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
