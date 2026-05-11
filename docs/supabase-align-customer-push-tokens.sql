-- Align public.customer_push_tokens with Hull Eats API (CustomerNotificationsService).
-- Run once in Supabase SQL Editor (or psql) against your Hull Eats database.
-- Safe to re-run: uses IF NOT EXISTS / guarded DO blocks where possible.
--
-- Before running: if duplicate Expo tokens exist, dedupe rows or the UNIQUE index on token will fail.

-- ---------------------------------------------------------------------------
-- 1) Column names the API expects: token (unique), platform
--    Supabase UI often uses push_token + device_type — rename if needed.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customer_push_tokens' AND column_name = 'push_token'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customer_push_tokens' AND column_name = 'token'
  ) THEN
    ALTER TABLE public.customer_push_tokens RENAME COLUMN push_token TO token;
  END IF;
END $$;

-- Both push_token and token existed (rare): merge then drop legacy column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customer_push_tokens' AND column_name = 'push_token'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customer_push_tokens' AND column_name = 'token'
  ) THEN
    UPDATE public.customer_push_tokens SET token = COALESCE(token, push_token) WHERE push_token IS NOT NULL;
    ALTER TABLE public.customer_push_tokens DROP COLUMN push_token;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customer_push_tokens' AND column_name = 'device_type'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customer_push_tokens' AND column_name = 'platform'
  ) THEN
    ALTER TABLE public.customer_push_tokens RENAME COLUMN device_type TO platform;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customer_push_tokens' AND column_name = 'device_type'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customer_push_tokens' AND column_name = 'platform'
  ) THEN
    UPDATE public.customer_push_tokens
    SET platform = COALESCE(NULLIF(TRIM(platform), ''), NULLIF(TRIM(device_type), ''), 'unknown');
    ALTER TABLE public.customer_push_tokens DROP COLUMN device_type;
  END IF;
END $$;

UPDATE public.customer_push_tokens SET platform = COALESCE(NULLIF(TRIM(platform), ''), 'unknown')
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'customer_push_tokens' AND column_name = 'platform'
);

-- ---------------------------------------------------------------------------
-- 2) Columns used by register + notify (order linkage, contact fallbacks)
-- ---------------------------------------------------------------------------
ALTER TABLE public.customer_push_tokens
  ADD COLUMN IF NOT EXISTS customer_id uuid;

ALTER TABLE public.customer_push_tokens
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.customer_push_tokens
  ADD COLUMN IF NOT EXISTS customer_email text;

ALTER TABLE public.customer_push_tokens
  ADD COLUMN IF NOT EXISTS customer_phone text;

ALTER TABLE public.customer_push_tokens
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.customer_push_tokens
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT timezone('utc', now());

-- Link customer_id → customer_profiles (skip if orphans would violate FK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'customer_push_tokens'
      AND constraint_name = 'customer_push_tokens_customer_id_fkey'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customer_push_tokens' AND column_name = 'customer_id'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'customer_profiles'
  ) THEN
    ALTER TABLE public.customer_push_tokens
      ADD CONSTRAINT customer_push_tokens_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES public.customer_profiles(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN foreign_key_violation THEN
    RAISE NOTICE 'Skipped customer_push_tokens → customer_profiles FK: fix orphan customer_id rows then add FK manually.';
END $$;

-- ---------------------------------------------------------------------------
-- 3) Unique Expo token (required for ON CONFLICT (token) in API)
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS customer_push_tokens_token_unique ON public.customer_push_tokens(token);

-- Helpful for notify query
CREATE INDEX IF NOT EXISTS idx_customer_push_tokens_order_active ON public.customer_push_tokens(order_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customer_push_tokens_email_active ON public.customer_push_tokens(lower(customer_email), is_active);
CREATE INDEX IF NOT EXISTS idx_customer_push_tokens_customer_active ON public.customer_push_tokens(customer_id, is_active);

-- ---------------------------------------------------------------------------
-- 4) Optional: updated_at trigger (if you use public.set_updated_at elsewhere)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'set_updated_at' AND n.nspname = 'public'
  ) THEN
    DROP TRIGGER IF EXISTS set_customer_push_tokens_updated_at ON public.customer_push_tokens;
    CREATE TRIGGER set_customer_push_tokens_updated_at
      BEFORE UPDATE ON public.customer_push_tokens
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
