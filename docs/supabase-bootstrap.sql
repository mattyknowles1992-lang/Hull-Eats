-- Hull Eats Supabase bootstrap schema
-- Paste this into the Supabase SQL editor.
-- Focus: customer accounts, addresses, multi-business marketplace, onboarding-friendly stores,
-- checkout/order foundations, and Stripe-linked payment records.

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
  if not exists (select 1 from pg_type where typname = 'store_type') then
    create type public.store_type as enum ('restaurant', 'takeaway', 'shop');
  end if;

  if not exists (select 1 from pg_type where typname = 'storefront_status') then
    create type public.storefront_status as enum ('onboarding', 'live', 'paused');
  end if;

  if not exists (select 1 from pg_type where typname = 'customer_address_type') then
    create type public.customer_address_type as enum ('home', 'work', 'other');
  end if;

  if not exists (select 1 from pg_type where typname = 'fulfillment_type') then
    create type public.fulfillment_type as enum ('delivery', 'pickup');
  end if;

  if not exists (select 1 from pg_type where typname = 'order_source') then
    create type public.order_source as enum ('web', 'ios_app', 'android_app', 'admin_portal');
  end if;

  if not exists (select 1 from pg_type where typname = 'checkout_session_status') then
    create type public.checkout_session_status as enum (
      'draft',
      'address_pending',
      'pricing_pending',
      'payment_pending',
      'ready_to_place',
      'completed',
      'expired'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum (
      'pending',
      'accepted',
      'rejected',
      'preparing',
      'ready_for_dispatch',
      'assigned',
      'courier_accepted',
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

  if not exists (select 1 from pg_type where typname = 'stock_status') then
    create type public.stock_status as enum ('in_stock', 'low_stock', 'out_of_stock');
  end if;

  if not exists (select 1 from pg_type where typname = 'inventory_adjustment_reason') then
    create type public.inventory_adjustment_reason as enum (
      'manual_adjustment',
      'order_placed',
      'order_cancelled',
      'restock',
      'stocktake'
    );
  end if;
end $$;

create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  supabase_auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  marketing_opt_in boolean not null default false,
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
  legal_name text,
  support_email text,
  support_phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.business_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (business_id, user_id)
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
  timezone text not null default 'Europe/London',
  short_description text,
  cuisine_label text,
  onboarding_message text,
  hero_image_url text,
  logo_image_url text,
  delivery_fee numeric(10,2) not null default 0,
  minimum_order_amount numeric(10,2) not null default 0,
  eta_minutes integer,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.store_hours (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  open_time text not null,
  close_time text not null,
  is_closed boolean not null default false
);

create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  postcode_patterns text[] not null default '{}',
  minimum_order_amount numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2),
  compare_at_price numeric(10,2),
  image_url text,
  is_active boolean not null default false,
  track_stock boolean not null default false,
  stock_quantity integer,
  low_stock_threshold integer,
  stock_status public.stock_status not null default 'in_stock',
  allow_backorder boolean not null default false,
  max_per_order integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  quantity_delta integer not null,
  reason public.inventory_adjustment_reason not null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid references public.customer_profiles(id) on delete set null,
  store_id uuid not null references public.stores(id) on delete cascade,
  delivery_zone_id uuid references public.delivery_zones(id) on delete set null,
  customer_address_id uuid references public.customer_addresses(id) on delete set null,
  source public.order_source not null default 'web',
  fulfillment_type public.fulfillment_type not null default 'delivery',
  status public.checkout_session_status not null default 'draft',
  notes text,
  subtotal_amount numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  currency text not null default 'GBP',
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.checkout_lines (
  id uuid primary key default gen_random_uuid(),
  checkout_session_id uuid not null references public.checkout_sessions(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name_snapshot text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2),
  total_price numeric(10,2),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  checkout_session_id uuid references public.checkout_sessions(id) on delete set null,
  customer_profile_id uuid references public.customer_profiles(id) on delete set null,
  customer_address_id uuid references public.customer_addresses(id) on delete set null,
  store_id uuid not null references public.stores(id) on delete cascade,
  delivery_zone_id uuid references public.delivery_zones(id) on delete set null,
  source public.order_source not null default 'web',
  fulfillment_type public.fulfillment_type not null default 'delivery',
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
  prep_time_minutes integer,
  placed_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  rejected_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
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
  notes text,
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
  order_id uuid not null unique references public.orders(id) on delete cascade,
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
create index if not exists idx_stores_business on public.stores(business_id);
create index if not exists idx_stores_status on public.stores(storefront_status, is_active);
create index if not exists idx_menu_categories_store on public.menu_categories(store_id);
create index if not exists idx_menu_items_category on public.menu_items(category_id);
create index if not exists idx_checkout_sessions_customer on public.checkout_sessions(customer_profile_id, created_at desc);
create index if not exists idx_orders_customer on public.orders(customer_profile_id, placed_at desc);
create index if not exists idx_orders_store on public.orders(store_id, placed_at desc);
create index if not exists idx_payments_customer on public.payments(customer_profile_id, created_at desc);

drop trigger if exists set_customer_profiles_updated_at on public.customer_profiles;
create trigger set_customer_profiles_updated_at
before update on public.customer_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_customer_addresses_updated_at on public.customer_addresses;
create trigger set_customer_addresses_updated_at
before update on public.customer_addresses
for each row execute function public.set_updated_at();

drop trigger if exists set_businesses_updated_at on public.businesses;
create trigger set_businesses_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

drop trigger if exists set_stores_updated_at on public.stores;
create trigger set_stores_updated_at
before update on public.stores
for each row execute function public.set_updated_at();

drop trigger if exists set_delivery_zones_updated_at on public.delivery_zones;
create trigger set_delivery_zones_updated_at
before update on public.delivery_zones
for each row execute function public.set_updated_at();

drop trigger if exists set_menu_categories_updated_at on public.menu_categories;
create trigger set_menu_categories_updated_at
before update on public.menu_categories
for each row execute function public.set_updated_at();

drop trigger if exists set_menu_items_updated_at on public.menu_items;
create trigger set_menu_items_updated_at
before update on public.menu_items
for each row execute function public.set_updated_at();

drop trigger if exists set_checkout_sessions_updated_at on public.checkout_sessions;
create trigger set_checkout_sessions_updated_at
before update on public.checkout_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create or replace function public.handle_new_customer_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customer_profiles (
    supabase_auth_user_id,
    email,
    full_name
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (supabase_auth_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_customer_profile on auth.users;
create trigger on_auth_user_created_customer_profile
after insert on auth.users
for each row execute function public.handle_new_customer_profile();

alter table public.customer_profiles enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.checkout_sessions enable row level security;
alter table public.checkout_lines enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.stores enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;

drop policy if exists "customer can read own profile" on public.customer_profiles;
create policy "customer can read own profile"
on public.customer_profiles
for select
to authenticated
using (auth.uid() = supabase_auth_user_id);

drop policy if exists "customer can update own profile" on public.customer_profiles;
create policy "customer can update own profile"
on public.customer_profiles
for update
to authenticated
using (auth.uid() = supabase_auth_user_id);

drop policy if exists "customer can read own addresses" on public.customer_addresses;
create policy "customer can read own addresses"
on public.customer_addresses
for select
to authenticated
using (
  exists (
    select 1
    from public.customer_profiles cp
    where cp.id = customer_profile_id
      and cp.supabase_auth_user_id = auth.uid()
  )
);

drop policy if exists "customer can insert own addresses" on public.customer_addresses;
create policy "customer can insert own addresses"
on public.customer_addresses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.customer_profiles cp
    where cp.id = customer_profile_id
      and cp.supabase_auth_user_id = auth.uid()
  )
);

drop policy if exists "customer can update own addresses" on public.customer_addresses;
create policy "customer can update own addresses"
on public.customer_addresses
for update
to authenticated
using (
  exists (
    select 1
    from public.customer_profiles cp
    where cp.id = customer_profile_id
      and cp.supabase_auth_user_id = auth.uid()
  )
);

drop policy if exists "customer can read own checkout sessions" on public.checkout_sessions;
create policy "customer can read own checkout sessions"
on public.checkout_sessions
for select
to authenticated
using (
  customer_profile_id is not null
  and exists (
    select 1
    from public.customer_profiles cp
    where cp.id = customer_profile_id
      and cp.supabase_auth_user_id = auth.uid()
  )
);

drop policy if exists "customer can manage own checkout sessions" on public.checkout_sessions;
create policy "customer can manage own checkout sessions"
on public.checkout_sessions
for all
to authenticated
using (
  customer_profile_id is not null
  and exists (
    select 1
    from public.customer_profiles cp
    where cp.id = customer_profile_id
      and cp.supabase_auth_user_id = auth.uid()
  )
)
with check (
  customer_profile_id is not null
  and exists (
    select 1
    from public.customer_profiles cp
    where cp.id = customer_profile_id
      and cp.supabase_auth_user_id = auth.uid()
  )
);

drop policy if exists "customer can read own orders" on public.orders;
create policy "customer can read own orders"
on public.orders
for select
to authenticated
using (
  customer_profile_id is not null
  and exists (
    select 1
    from public.customer_profiles cp
    where cp.id = customer_profile_id
      and cp.supabase_auth_user_id = auth.uid()
  )
);

drop policy if exists "customer can read own payments" on public.payments;
create policy "customer can read own payments"
on public.payments
for select
to authenticated
using (
  customer_profile_id is not null
  and exists (
    select 1
    from public.customer_profiles cp
    where cp.id = customer_profile_id
      and cp.supabase_auth_user_id = auth.uid()
  )
);

drop policy if exists "public can browse live stores" on public.stores;
create policy "public can browse live stores"
on public.stores
for select
to anon, authenticated
using (is_active = true and storefront_status = 'live');

drop policy if exists "public can browse live delivery zones" on public.delivery_zones;
create policy "public can browse live delivery zones"
on public.delivery_zones
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1 from public.stores s
    where s.id = store_id
      and s.is_active = true
      and s.storefront_status = 'live'
  )
);

drop policy if exists "public can browse live categories" on public.menu_categories;
create policy "public can browse live categories"
on public.menu_categories
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1 from public.stores s
    where s.id = store_id
      and s.is_active = true
      and s.storefront_status = 'live'
  )
);

drop policy if exists "public can browse live items" on public.menu_items;
create policy "public can browse live items"
on public.menu_items
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.menu_categories mc
    join public.stores s on s.id = mc.store_id
    where mc.id = category_id
      and mc.is_active = true
      and s.is_active = true
      and s.storefront_status = 'live'
  )
);

-- Mock marketplace businesses with no required items yet
insert into public.businesses (slug, name, support_email, is_active)
values
  ('harbour-kitchen', 'Harbour Kitchen', 'hello@harbourkitchen.local', true),
  ('dockside-grocer', 'Dockside Grocer', 'hello@docksidegrocer.local', true),
  ('ember-burger', 'Ember Burger', 'hello@emberburger.local', true),
  ('north-point-takeaway', 'North Point Takeaway', 'hello@northpoint.local', true)
on conflict (slug) do nothing;

insert into public.stores (
  business_id,
  slug,
  name,
  type,
  storefront_status,
  menu_setup_complete,
  address_line_1,
  city,
  postcode,
  short_description,
  cuisine_label,
  onboarding_message,
  hero_image_url,
  delivery_fee,
  minimum_order_amount,
  eta_minutes,
  is_active
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
