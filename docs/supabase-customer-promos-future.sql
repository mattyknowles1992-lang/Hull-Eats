-- Future: account-level discounts and loyalty (not applied by app yet).
-- Run only when you are ready to build admin assign + checkout application.

create type if not exists public.customer_promo_kind as enum (
  'percent_off_order',
  'fixed_off_order',
  'free_delivery',
  'loyalty_points_credit'
);

create table if not exists public.customer_promo_entitlements (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.customer_profiles(id) on delete cascade,
  code text,
  kind public.customer_promo_kind not null,
  percent_off numeric(5,2),
  fixed_amount_pence integer,
  min_order_pence integer,
  max_uses integer,
  uses_count integer not null default 0,
  valid_from timestamptz not null default timezone('utc', now()),
  valid_until timestamptz,
  assigned_by text,
  campaign_label text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists customer_promo_entitlements_profile_idx
  on public.customer_promo_entitlements (customer_profile_id);

create table if not exists public.customer_loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.customer_profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  delta_points integer not null,
  reason text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists customer_loyalty_ledger_profile_idx
  on public.customer_loyalty_ledger (customer_profile_id);

-- RLS: customers read own rows; service role / admin API writes.
alter table public.customer_promo_entitlements enable row level security;
alter table public.customer_loyalty_ledger enable row level security;
