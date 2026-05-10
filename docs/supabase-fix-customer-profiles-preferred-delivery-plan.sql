-- Sync public.customer_profiles with sync_customer_profile_from_auth() in docs/supabase-bootstrap.sql.
-- Run in Supabase Dashboard → SQL Editor. Safe to re-run (IF NOT EXISTS).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'customer_delivery_plan') then
    create type public.customer_delivery_plan as enum ('pay_as_you_go', 'hull_eats_plus');
  end if;
end $$;

alter table public.customer_profiles
  add column if not exists preferred_delivery_plan public.customer_delivery_plan not null default 'pay_as_you_go';

alter table public.customer_profiles
  add column if not exists marketing_opt_in boolean not null default false;

alter table public.customer_profiles
  add column if not exists signup_promo_code text;

alter table public.customer_profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz;
