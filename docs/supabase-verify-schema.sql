-- =============================================================================
-- WHAT THIS FILE IS FOR (read this first)
-- =============================================================================
-- You are CHECKING what already exists in your database — not changing it.
-- Run these queries in: Supabase dashboard → SQL Editor → New query → Paste → Run.
--
-- After you run STEP 1–3 below, you will see whether tables like store_promotions
-- exist. If they are MISSING, then you need to APPLY migrations (different step —
-- see docs or ask to run prisma migrate deploy with your DATABASE_URL).
--
-- Your older screenshots only showed customer_push_tokens — they do NOT prove
-- newer tables (offers, courier assignments) exist. Run this script to see truth.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1 — Does Prisma track migrations on this database?
-- Safe. Always runs.
-- -----------------------------------------------------------------------------
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
) AS prisma_migration_history_exists;

-- -----------------------------------------------------------------------------
-- STEP 2 — Run this in a NEW query ONLY if STEP 1 showed prisma_migration_history_exists = true
-- (Otherwise Postgres errors because the table does not exist yet.)
--
--   SELECT migration_name, finished_at
--   FROM public._prisma_migrations
--   ORDER BY finished_at NULLS LAST;
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- STEP 3 — Which important Hull Eats tables exist right now? (always safe)
-- -----------------------------------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'store_promotions',
    'store_courier_assignments',
    'resale_listings',
    'courier_profiles',
    'courier_accounts',
    'stores',
    'businesses',
    'customer_push_tokens'
  )
ORDER BY table_name;

-- -----------------------------------------------------------------------------
-- STEP 4 — Detail for offers table (only informative; empty result = table missing)
-- -----------------------------------------------------------------------------
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'store_promotions'
ORDER BY ordinal_position;

-- -----------------------------------------------------------------------------
-- STEP 5 — Detail for courier ↔ hub links (empty result = table missing)
-- -----------------------------------------------------------------------------
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'store_courier_assignments'
ORDER BY ordinal_position;

-- -----------------------------------------------------------------------------
-- STEP 6 — Offer enums (optional; empty = enums not created yet)
-- -----------------------------------------------------------------------------
SELECT t.typname AS enum_name, string_agg(e.enumlabel::text, ', ' ORDER BY e.enumsortorder) AS values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
  AND t.typname IN ('store_promotion_kind', 'store_promotion_scope')
GROUP BY t.typname;

-- -----------------------------------------------------------------------------
-- STEP 7 — ID verification columns (checkout + merchant hub need these)
-- -----------------------------------------------------------------------------
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('menu_items', 'order_items')
  AND column_name = 'requires_id_verification'
ORDER BY table_name;
