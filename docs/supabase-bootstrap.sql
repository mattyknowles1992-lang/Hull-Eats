-- Hull Eats Supabase bootstrap schema
-- Paste this into the Supabase SQL editor.
--
-- Customer account rules for v1:
-- 1. Passwords are never stored in public tables. Supabase Auth owns password hashing, reset, and change flows.
-- 2. customer_profiles stores marketplace-facing customer data only.
-- 3. email_verified_at mirrors auth verification state for easy app queries.
-- 4. Hull Eats+ free-delivery subscriptions are blocked until the customer's email is verified.
-- 5. Customer app/web is storefront + ordering only. Catalog management belongs in the admin/merchant portals.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'customer_address_type') then
    create type public.customer_address_type as enum ('home', 'work', 'other');
  end if;

  if not exists (select 1 from pg_type where typname = 'customer_account_status') then
    create type public.customer_account_status as enum ('active', 'disabled');
  end if;

  if not exists (select 1 from pg_type where typname = 'customer_delivery_plan') then
    create type public.customer_delivery_plan as enum ('pay_as_you_go', 'hull_eats_plus');
  end if;

  if not exists (select 1 from pg_type where typname = 'store_type') then
    create type public.store_type as enum ('restaurant', 'takeaway', 'shop');
  end if;

  if not exists (select 1 from pg_type where typname = 'storefront_status') then
    create type public.storefront_status as enum ('onboarding', 'live', 'paused');
  end if;

  if not exists (select 1 from pg_type where typname = 'membership_role') then
    create type public.membership_role as enum ('owner', 'manager', 'staff');
  end if;

  if not exists (select 1 from pg_type where typname = 'hub_user_status') then
    create type public.hub_user_status as enum ('active', 'invited', 'disabled');
  end if;

  if not exists (select 1 from pg_type where typname = 'stock_status') then
    create type public.stock_status as enum ('in_stock', 'low_stock', 'out_of_stock');
  end if;

  if not exists (select 1 from pg_type where typname = 'menu_import_source_type') then
    create type public.menu_import_source_type as enum ('image', 'text');
  end if;

  if not exists (select 1 from pg_type where typname = 'menu_import_status') then
    create type public.menu_import_status as enum ('pending_review', 'applied', 'discarded');
  end if;

  if not exists (select 1 from pg_type where typname = 'order_source') then
    create type public.order_source as enum ('web', 'ios_app', 'android_app', 'admin_portal');
  end if;

  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum (
      'pending',
      'accepted',
      'rejected',
      'preparing',
      'assigned',
      'picked_up',
      'delivered',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('pending', 'authorized', 'paid', 'failed', 'refunded');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_record_status') then
    create type public.payment_record_status as enum (
      'requires_payment_method',
      'requires_confirmation',
      'requires_action',
      'processing',
      'succeeded',
      'canceled',
      'failed',
      'refunded'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_method_type') then
    create type public.payment_method_type as enum ('card', 'apple_pay', 'google_pay');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum (
      'inactive',
      'incomplete',
      'trialing',
      'active',
      'past_due',
      'unpaid',
      'paused',
      'canceled'
    );
  end if;
end $$;

create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  supabase_auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  email_verified_at timestamptz,
  account_status public.customer_account_status not null default 'active',
  marketing_opt_in boolean not null default false,
  preferred_delivery_plan public.customer_delivery_plan not null default 'pay_as_you_go',
  signup_promo_code text,
  stripe_customer_id text unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.customer_profiles(id) on delete cascade,
  label text not null,
  type public.customer_address_type not null default 'home',
  full_name text not null,
  phone text not null,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  postcode text not null,
  delivery_notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.customer_profiles
  add column if not exists default_address_id uuid references public.customer_addresses(id) on delete set null;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  support_email text,
  support_phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  slug text not null unique,
  name text not null,
  type public.store_type not null,
  storefront_status public.storefront_status not null default 'onboarding',
  menu_setup_complete boolean not null default false,
  address_line_1 text not null,
  city text not null,
  postcode text not null,
  short_description text,
  cuisine_label text,
  onboarding_message text,
  hero_image_url text,
  delivery_fee numeric(10,2) not null default 0,
  minimum_order_amount numeric(10,2) not null default 0,
  eta_minutes integer,
  timezone text not null default 'Europe/London',
  logo_asset_id uuid,
  cover_asset_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.stores
  add column if not exists timezone text not null default 'Europe/London',
  add column if not exists logo_asset_id uuid,
  add column if not exists cover_asset_id uuid;

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.menu_categories
  add column if not exists description text;

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  primary_image_asset_id uuid,
  sku text,
  name text not null,
  description text,
  price numeric(10,2),
  compare_at_price numeric(10,2),
  image_url text,
  customisation_config jsonb,
  is_active boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.menu_items
  add column if not exists primary_image_asset_id uuid,
  add column if not exists sku text,
  add column if not exists compare_at_price numeric(10,2),
  add column if not exists customisation_config jsonb,
  add column if not exists is_featured boolean not null default false,
  add column if not exists track_stock boolean not null default false,
  add column if not exists stock_quantity integer,
  add column if not exists low_stock_threshold integer,
  add column if not exists stock_status public.stock_status not null default 'in_stock',
  add column if not exists allow_backorder boolean not null default false,
  add column if not exists max_per_order integer,
  add column if not exists sort_order integer not null default 0;

create table if not exists public.hub_users (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  username text not null unique,
  password_hash text not null,
  role public.membership_role not null default 'manager',
  status public.hub_user_status not null default 'active',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.menu_import_batches (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  created_by_user_id uuid references public.hub_users(id) on delete set null,
  source_type public.menu_import_source_type not null,
  source_label text not null,
  status public.menu_import_status not null default 'pending_review',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.menu_import_candidates (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.menu_import_batches(id) on delete cascade,
  suggested_category_name text not null,
  item_name text not null,
  description text,
  price numeric(10,2) not null default 0,
  source_line text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.customer_favourites (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.customer_profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (customer_profile_id, store_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.customer_profiles(id) on delete cascade,
  provider text not null default 'stripe',
  plan_code text not null default 'hull-eats-plus-monthly',
  status public.subscription_status not null default 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  free_delivery_active boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  stripe_event_id text unique,
  event_type text not null,
  status public.subscription_status,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_profile_id uuid references public.customer_profiles(id) on delete set null,
  customer_address_id uuid references public.customer_addresses(id) on delete set null,
  store_id uuid not null references public.stores(id) on delete cascade,
  source public.order_source not null default 'web',
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  address_line_1 text,
  address_line_2 text,
  city text,
  postcode text,
  notes text,
  subtotal_amount numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  currency text not null default 'GBP',
  placed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2),
  total_price numeric(10,2),
  name_snapshot text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  status public.order_status not null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique references public.orders(id) on delete cascade,
  customer_profile_id uuid references public.customer_profiles(id) on delete set null,
  provider text not null default 'stripe',
  status public.payment_record_status not null,
  method_type public.payment_method_type,
  stripe_customer_id text,
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  amount numeric(10,2) not null,
  currency text not null default 'GBP',
  failure_code text,
  failure_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  stripe_event_id text unique,
  event_type text not null,
  status public.payment_record_status,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_customer_addresses_customer on public.customer_addresses(customer_profile_id);
create unique index if not exists idx_customer_addresses_default on public.customer_addresses(customer_profile_id) where is_default = true;
create index if not exists idx_customer_favourites_customer on public.customer_favourites(customer_profile_id, created_at desc);
create index if not exists idx_subscriptions_customer on public.subscriptions(customer_profile_id, created_at desc);
create index if not exists idx_stores_business on public.stores(business_id);
create index if not exists idx_stores_status on public.stores(storefront_status, is_active);
create index if not exists idx_menu_categories_store on public.menu_categories(store_id);
create index if not exists idx_menu_items_category on public.menu_items(category_id);
create index if not exists idx_hub_users_business on public.hub_users(business_id, role);
create index if not exists idx_menu_import_batches_store on public.menu_import_batches(store_id, created_at desc);
create index if not exists idx_menu_import_candidates_batch on public.menu_import_candidates(batch_id, sort_order);
create index if not exists idx_orders_customer on public.orders(customer_profile_id, placed_at desc);
create index if not exists idx_orders_store on public.orders(store_id, placed_at desc);
create index if not exists idx_payments_customer on public.payments(customer_profile_id, created_at desc);

drop trigger if exists set_customer_profiles_updated_at on public.customer_profiles;
create trigger set_customer_profiles_updated_at before update on public.customer_profiles for each row execute function public.set_updated_at();

drop trigger if exists set_customer_addresses_updated_at on public.customer_addresses;
create trigger set_customer_addresses_updated_at before update on public.customer_addresses for each row execute function public.set_updated_at();

drop trigger if exists set_businesses_updated_at on public.businesses;
create trigger set_businesses_updated_at before update on public.businesses for each row execute function public.set_updated_at();

drop trigger if exists set_stores_updated_at on public.stores;
create trigger set_stores_updated_at before update on public.stores for each row execute function public.set_updated_at();

drop trigger if exists set_menu_categories_updated_at on public.menu_categories;
create trigger set_menu_categories_updated_at before update on public.menu_categories for each row execute function public.set_updated_at();

drop trigger if exists set_menu_items_updated_at on public.menu_items;
create trigger set_menu_items_updated_at before update on public.menu_items for each row execute function public.set_updated_at();

drop trigger if exists set_hub_users_updated_at on public.hub_users;
create trigger set_hub_users_updated_at before update on public.hub_users for each row execute function public.set_updated_at();

drop trigger if exists set_menu_import_batches_updated_at on public.menu_import_batches;
create trigger set_menu_import_batches_updated_at before update on public.menu_import_batches for each row execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at before update on public.orders for each row execute function public.set_updated_at();

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at before update on public.payments for each row execute function public.set_updated_at();

create or replace function public.sync_customer_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_id uuid;
  profile_default_address_id uuid;
begin
  insert into public.customer_profiles (
    supabase_auth_user_id,
    email,
    full_name,
    phone,
    email_verified_at,
    marketing_opt_in,
    preferred_delivery_plan,
    signup_promo_code
  )
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
    new.email_confirmed_at,
    coalesce((new.raw_user_meta_data ->> 'marketing_opt_in')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'preferred_delivery_plan')::public.customer_delivery_plan, 'pay_as_you_go'),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'signup_promo_code', '')), '')
  )
  on conflict (supabase_auth_user_id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.customer_profiles.full_name),
    phone = coalesce(excluded.phone, public.customer_profiles.phone),
    email_verified_at = excluded.email_verified_at,
    marketing_opt_in = excluded.marketing_opt_in,
    preferred_delivery_plan = excluded.preferred_delivery_plan,
    signup_promo_code = coalesce(excluded.signup_promo_code, public.customer_profiles.signup_promo_code),
    updated_at = timezone('utc', now());

  select id, default_address_id
  into profile_id, profile_default_address_id
  from public.customer_profiles
  where supabase_auth_user_id = new.id;

  if profile_id is not null
    and profile_default_address_id is null
    and nullif(trim(coalesce(new.raw_user_meta_data ->> 'address_line_1', '')), '') is not null
    and nullif(trim(coalesce(new.raw_user_meta_data ->> 'postcode', '')), '') is not null
  then
    insert into public.customer_addresses (
      customer_profile_id,
      label,
      type,
      full_name,
      phone,
      address_line_1,
      address_line_2,
      city,
      postcode,
      delivery_notes,
      is_default
    )
    values (
      profile_id,
      coalesce(nullif(trim(coalesce(new.raw_user_meta_data ->> 'address_label', '')), ''), 'Home'),
      coalesce((new.raw_user_meta_data ->> 'address_type')::public.customer_address_type, 'home'),
      coalesce(nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''), 'Customer'),
      coalesce(nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''), ''),
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'address_line_1', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'address_line_2', '')), ''),
      coalesce(nullif(trim(coalesce(new.raw_user_meta_data ->> 'city', '')), ''), 'Hull'),
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'postcode', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'delivery_notes', '')), ''),
      true
    )
    returning id into profile_default_address_id;

    update public.customer_profiles
    set default_address_id = profile_default_address_id
    where id = profile_id;
  end if;

  if profile_id is not null
    and coalesce((new.raw_user_meta_data ->> 'preferred_delivery_plan')::public.customer_delivery_plan, 'pay_as_you_go') = 'hull_eats_plus'
    and not exists (
      select 1
      from public.subscriptions s
      where s.customer_profile_id = profile_id
    )
  then
    insert into public.subscriptions (
      customer_profile_id,
      provider,
      plan_code,
      status,
      free_delivery_active
    )
    values (
      profile_id,
      'stripe',
      'hull-eats-plus-monthly',
      'inactive',
      false
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_customer_profile on auth.users;
create trigger on_auth_user_created_customer_profile after insert on auth.users for each row execute function public.sync_customer_profile_from_auth();

drop trigger if exists on_auth_user_updated_customer_profile on auth.users;
create trigger on_auth_user_updated_customer_profile after update on auth.users for each row execute function public.sync_customer_profile_from_auth();

create or replace function public.enforce_verified_email_for_subscription()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  profile_record public.customer_profiles%rowtype;
begin
  select * into profile_record
  from public.customer_profiles
  where id = new.customer_profile_id;

  if profile_record.id is null then
    raise exception 'Customer profile not found for subscription';
  end if;

  if (
    new.free_delivery_active = true
    or new.status in ('incomplete', 'trialing', 'active', 'past_due', 'unpaid', 'paused')
  ) and profile_record.email_verified_at is null then
    raise exception 'Email must be verified before starting or activating Hull Eats+';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_verified_email_for_subscription on public.subscriptions;
create trigger enforce_verified_email_for_subscription before insert or update on public.subscriptions for each row execute function public.enforce_verified_email_for_subscription();
alter table public.customer_profiles enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.customer_favourites enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_events enable row level security;
alter table public.businesses enable row level security;
alter table public.hub_users enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.stores enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_import_batches enable row level security;
alter table public.menu_import_candidates enable row level security;

drop policy if exists "customer can read own profile" on public.customer_profiles;
create policy "customer can read own profile" on public.customer_profiles for select to authenticated using (auth.uid() = supabase_auth_user_id);

drop policy if exists "customer can update own profile" on public.customer_profiles;
create policy "customer can update own profile" on public.customer_profiles for update to authenticated using (auth.uid() = supabase_auth_user_id) with check (auth.uid() = supabase_auth_user_id);

drop policy if exists "customer can read own addresses" on public.customer_addresses;
create policy "customer can read own addresses" on public.customer_addresses for select to authenticated using (
  exists (select 1 from public.customer_profiles cp where cp.id = customer_profile_id and cp.supabase_auth_user_id = auth.uid())
);

drop policy if exists "customer can insert own addresses" on public.customer_addresses;
create policy "customer can insert own addresses" on public.customer_addresses for insert to authenticated with check (
  exists (select 1 from public.customer_profiles cp where cp.id = customer_profile_id and cp.supabase_auth_user_id = auth.uid())
);

drop policy if exists "customer can update own addresses" on public.customer_addresses;
create policy "customer can update own addresses" on public.customer_addresses for update to authenticated using (
  exists (select 1 from public.customer_profiles cp where cp.id = customer_profile_id and cp.supabase_auth_user_id = auth.uid())
) with check (
  exists (select 1 from public.customer_profiles cp where cp.id = customer_profile_id and cp.supabase_auth_user_id = auth.uid())
);

drop policy if exists "customer can delete own addresses" on public.customer_addresses;
create policy "customer can delete own addresses" on public.customer_addresses for delete to authenticated using (
  exists (select 1 from public.customer_profiles cp where cp.id = customer_profile_id and cp.supabase_auth_user_id = auth.uid())
);

drop policy if exists "customer can read own favourites" on public.customer_favourites;
create policy "customer can read own favourites" on public.customer_favourites for select to authenticated using (
  exists (select 1 from public.customer_profiles cp where cp.id = customer_profile_id and cp.supabase_auth_user_id = auth.uid())
);

drop policy if exists "customer can insert own favourites" on public.customer_favourites;
create policy "customer can insert own favourites" on public.customer_favourites for insert to authenticated with check (
  exists (select 1 from public.customer_profiles cp where cp.id = customer_profile_id and cp.supabase_auth_user_id = auth.uid())
);

drop policy if exists "customer can delete own favourites" on public.customer_favourites;
create policy "customer can delete own favourites" on public.customer_favourites for delete to authenticated using (
  exists (select 1 from public.customer_profiles cp where cp.id = customer_profile_id and cp.supabase_auth_user_id = auth.uid())
);

drop policy if exists "customer can read own subscriptions" on public.subscriptions;
create policy "customer can read own subscriptions" on public.subscriptions for select to authenticated using (
  exists (select 1 from public.customer_profiles cp where cp.id = customer_profile_id and cp.supabase_auth_user_id = auth.uid())
);

drop policy if exists "customer can read own orders" on public.orders;
create policy "customer can read own orders" on public.orders for select to authenticated using (
  customer_profile_id is not null
  and exists (select 1 from public.customer_profiles cp where cp.id = customer_profile_id and cp.supabase_auth_user_id = auth.uid())
);

drop policy if exists "customer can read own order items" on public.order_items;
create policy "customer can read own order items" on public.order_items for select to authenticated using (
  exists (
    select 1 from public.orders o
    join public.customer_profiles cp on cp.id = o.customer_profile_id
    where o.id = order_id and cp.supabase_auth_user_id = auth.uid()
  )
);

drop policy if exists "customer can read own order history events" on public.order_status_history;
create policy "customer can read own order history events" on public.order_status_history for select to authenticated using (
  exists (
    select 1 from public.orders o
    join public.customer_profiles cp on cp.id = o.customer_profile_id
    where o.id = order_id and cp.supabase_auth_user_id = auth.uid()
  )
);

drop policy if exists "customer can read own payments" on public.payments;
create policy "customer can read own payments" on public.payments for select to authenticated using (
  customer_profile_id is not null
  and exists (select 1 from public.customer_profiles cp where cp.id = customer_profile_id and cp.supabase_auth_user_id = auth.uid())
);

drop policy if exists "public can browse live stores" on public.stores;
create policy "public can browse live stores" on public.stores for select to anon, authenticated using (is_active = true and storefront_status = 'live');

drop policy if exists "public can browse live categories" on public.menu_categories;
create policy "public can browse live categories" on public.menu_categories for select to anon, authenticated using (
  is_active = true and exists (
    select 1 from public.stores s where s.id = store_id and s.is_active = true and s.storefront_status = 'live'
  )
);

drop policy if exists "public can browse live items" on public.menu_items;
create policy "public can browse live items" on public.menu_items for select to anon, authenticated using (
  is_active = true and exists (
    select 1
    from public.menu_categories mc
    join public.stores s on s.id = mc.store_id
    where mc.id = category_id and mc.is_active = true and s.is_active = true and s.storefront_status = 'live'
  )
);

insert into public.businesses (slug, name, support_email, is_active)
values
  ('harbour-kitchen', 'Harbour Kitchen', 'hello@harbourkitchen.local', true),
  ('dockside-grocer', 'Dockside Grocer', 'hello@docksidegrocer.local', true),
  ('ember-burger', 'Ember Burger', 'hello@emberburger.local', true),
  ('north-point-takeaway', 'North Point Takeaway', 'hello@northpoint.local', true)
on conflict (slug) do nothing;

insert into public.stores (
  business_id, slug, name, type, storefront_status, menu_setup_complete,
  address_line_1, city, postcode, short_description, cuisine_label, onboarding_message,
  hero_image_url, delivery_fee, minimum_order_amount, eta_minutes, is_active
)
select b.id, 'harbour-kitchen-hull', 'Harbour Kitchen Hull', 'restaurant', 'live', false,
  '14 Marina Walk', 'Hull', 'HU1 2AB',
  'Fresh everyday food and seasonal specials.',
  'Modern comfort food',
  'This business is onboarding its menu. Customers can discover the store now while products are added.',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
  2.99, 12.00, 22, true
from public.businesses b
where b.slug = 'harbour-kitchen'
on conflict (slug) do nothing;

insert into public.stores (
  business_id, slug, name, type, storefront_status, menu_setup_complete,
  address_line_1, city, postcode, short_description, cuisine_label, onboarding_message,
  hero_image_url, delivery_fee, minimum_order_amount, eta_minutes, is_active
)
select b.id, 'dockside-grocer-hull', 'Dockside Grocer Hull', 'shop', 'live', false,
  '82 Humber Street', 'Hull', 'HU1 1TU',
  'Local essentials, snacks, and convenience delivery.',
  'Groceries and convenience',
  'Stock and items are being entered by the business owner.',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
  3.49, 10.00, 18, true
from public.businesses b
where b.slug = 'dockside-grocer'
on conflict (slug) do nothing;

insert into public.stores (
  business_id, slug, name, type, storefront_status, menu_setup_complete,
  address_line_1, city, postcode, short_description, cuisine_label, onboarding_message,
  hero_image_url, delivery_fee, minimum_order_amount, eta_minutes, is_active
)
select b.id, 'ember-burger-hull', 'Ember Burger Hull', 'takeaway', 'onboarding', false,
  '55 Beverley Road', 'Hull', 'HU3 1XL',
  'Smash burgers and loaded fries coming soon.',
  'Burgers',
  'Business setup is in progress. Menu entry has not started yet.',
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
  2.49, 11.00, 24, true
from public.businesses b
where b.slug = 'ember-burger'
on conflict (slug) do nothing;

insert into public.stores (
  business_id, slug, name, type, storefront_status, menu_setup_complete,
  address_line_1, city, postcode, short_description, cuisine_label, onboarding_message,
  hero_image_url, delivery_fee, minimum_order_amount, eta_minutes, is_active
)
select b.id, 'north-point-takeaway-hull', 'North Point Takeaway Hull', 'takeaway', 'live', false,
  '101 Spring Bank', 'Hull', 'HU3 1BH',
  'Fast comfort food, family bundles, and evening delivery.',
  'Takeaway favourites',
  'Store is live in the marketplace and ready for menu entry.',
  'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80',
  2.79, 9.50, 19, true
from public.businesses b
where b.slug = 'north-point-takeaway'
on conflict (slug) do nothing;

-- What a basic customer signup stores through the auth trigger:
-- - customer_profiles.supabase_auth_user_id
-- - customer_profiles.email
-- - customer_profiles.full_name (if sent in auth metadata)
-- - customer_profiles.phone (if sent in auth metadata)
-- - customer_profiles.email_verified_at (null until email is verified)
-- - customer_profiles.account_status
-- - customer_profiles.marketing_opt_in
-- - customer_profiles.preferred_delivery_plan
-- - customer_profiles.signup_promo_code
-- - customer_addresses default row from signup metadata when address fields are provided
-- - subscriptions starter row when Hull Eats+ is selected
--
-- What we do not store:
-- - plaintext password
-- - hashed password in public schema
-- - card number
-- - card expiry
-- - cvv/cvc
