-- Add schema that the Hull Eats API/Prisma expect for:
--   • Merchant hub “Offers & deals” (store_promotions)
--   • Merchant hub “Courier team” + courier app store filtering (store_courier_assignments)
--
-- Safe if you already ran manual bootstrap + order-flow patches: this only ADDS objects.
-- Run in Supabase → SQL Editor as one script.
--
-- If something already exists, this script skips or no-ops where possible.
-- If you get an error, copy the error message — often means the object exists under a different definition.

-- ---------------------------------------------------------------------------
-- 1) Enums for offers
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'store_promotion_kind') THEN
    CREATE TYPE public.store_promotion_kind AS ENUM (
      'BOGO_ITEM',
      'PERCENT_OFF',
      'FIXED_AMOUNT_ITEM',
      'BUNDLE_FIXED_PRICE'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'store_promotion_scope') THEN
    CREATE TYPE public.store_promotion_scope AS ENUM (
      'ITEMS',
      'CATEGORIES',
      'WHOLE_MENU'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) store_promotions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  title TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  kind public.store_promotion_kind NOT NULL,
  scope public.store_promotion_scope NOT NULL,
  percent_off DECIMAL(5, 2),
  fixed_amount_off DECIMAL(10, 2),
  bundle_fixed_price DECIMAL(10, 2),
  menu_item_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  category_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  bundle_lines JSONB,
  valid_dates TEXT[] NOT NULL,
  daily_start_time TEXT,
  daily_end_time TEXT,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Matches packages/db migration: Prisma @updatedAt supplies this on insert; default helps raw SQL.
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT store_promotions_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS store_promotions_store_id_idx ON public.store_promotions (store_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'store_promotions_store_id_fkey'
  ) THEN
    ALTER TABLE public.store_promotions
      ADD CONSTRAINT store_promotions_store_id_fkey
      FOREIGN KEY (store_id) REFERENCES public.stores (id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

drop trigger if exists set_store_promotions_updated_at on public.store_promotions;
create trigger set_store_promotions_updated_at
  before update on public.store_promotions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3) store_courier_assignments (courier_profile_id matches public.courier_profiles.id text)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_courier_assignments (
  id TEXT NOT NULL,
  store_id UUID NOT NULL,
  courier_profile_id TEXT NOT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT store_courier_assignments_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS store_courier_assignments_store_id_courier_profile_id_key
  ON public.store_courier_assignments (store_id, courier_profile_id);

CREATE INDEX IF NOT EXISTS store_courier_assignments_courier_profile_id_idx
  ON public.store_courier_assignments (courier_profile_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_courier_assignments_store_id_fkey'
  ) THEN
    ALTER TABLE public.store_courier_assignments
      ADD CONSTRAINT store_courier_assignments_store_id_fkey
      FOREIGN KEY (store_id) REFERENCES public.stores (id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_courier_assignments_courier_profile_id_fkey'
  ) THEN
    ALTER TABLE public.store_courier_assignments
      ADD CONSTRAINT store_courier_assignments_courier_profile_id_fkey
      FOREIGN KEY (courier_profile_id) REFERENCES public.courier_profiles (id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Optional: RLS off for API service role (matches many Hull Eats public tables used only from backend)
-- alter table public.store_promotions enable row level security;
-- alter table public.store_courier_assignments enable row level security;
