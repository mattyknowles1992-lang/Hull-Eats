-- Read-only: see what your Supabase DB looks like before you choose "fix in place" vs "start fresh".
-- Run in Supabase → SQL Editor. Safe: no changes.

-- A) All public tables (names only)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- B) Prisma migration table present?
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
) AS prisma_tracks_migrations;

-- C) Row counts (run one at a time; if you get "relation does not exist", that table isn’t there yet)
SELECT COUNT(*) AS businesses FROM public.businesses;
SELECT COUNT(*) AS stores FROM public.stores;
SELECT COUNT(*) AS orders FROM public.orders;
SELECT COUNT(*) AS platform_users FROM public.platform_users;
SELECT COUNT(*) AS customer_profiles FROM public.customer_profiles;
SELECT COUNT(*) AS hub_users FROM public.hub_users;
SELECT COUNT(*) AS courier_accounts FROM public.courier_accounts;
-- Newer features (optional — skip if error):
-- SELECT COUNT(*) AS store_promotions FROM public.store_promotions;
-- SELECT COUNT(*) AS store_courier_assignments FROM public.store_courier_assignments;

-- D) Optional: objects that might conflict with a clean Prisma deploy (names only; review manually)
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('store_promotions', 'store_courier_assignments', 'resale_listings', '_prisma_migrations')
ORDER BY tablename;
