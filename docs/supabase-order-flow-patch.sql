-- Hull Eats order flow patch
-- Paste this into the Supabase SQL editor for existing databases.
-- It aligns the live checkout, merchant hub orders, receipt printing, and courier tracking schema.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('platform_admin', 'merchant_manager', 'merchant_staff', 'courier', 'customer');
  end if;

  if not exists (select 1 from pg_type where typname = 'customer_account_status') then
    create type public.customer_account_status as enum ('active', 'suspended', 'banned', 'disabled', 'deleted');
  end if;

  if not exists (select 1 from pg_type where typname = 'fulfillment_type') then
    create type public.fulfillment_type as enum ('delivery', 'pickup');
  end if;

  if not exists (select 1 from pg_type where typname = 'delivery_status') then
    create type public.delivery_status as enum ('unassigned', 'assigned', 'accepted', 'picked_up', 'delivered', 'failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'driver_status') then
    create type public.driver_status as enum ('offline', 'available', 'on_delivery');
  end if;

  if not exists (select 1 from pg_type where typname = 'printer_adapter_type') then
    create type public.printer_adapter_type as enum ('mock', 'network_esc_pos', 'cloud_bridge');
  end if;

  if not exists (select 1 from pg_type where typname = 'print_job_status') then
    create type public.print_job_status as enum ('queued', 'processing', 'completed', 'failed');
  end if;
end $$;

alter type public.customer_account_status add value if not exists 'suspended';
alter type public.customer_account_status add value if not exists 'banned';
alter type public.customer_account_status add value if not exists 'deleted';
alter type public.order_source add value if not exists 'kiosk';
alter type public.order_status add value if not exists 'ready_for_dispatch';
alter type public.order_status add value if not exists 'courier_accepted';

alter table public.orders
  add column if not exists address_line_2 text,
  add column if not exists delivery_zone_id uuid,
  add column if not exists fulfillment_type public.fulfillment_type not null default 'delivery',
  add column if not exists prep_time_minutes integer,
  add column if not exists accepted_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists picked_up_at timestamptz,
  add column if not exists delivered_at timestamptz;

alter table public.order_items
  add column if not exists notes text;

alter table public.customer_profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists manual_review_required boolean not null default false,
  add column if not exists risk_notes text,
  add column if not exists suspended_at timestamptz,
  add column if not exists banned_at timestamptz,
  add column if not exists ban_reason text;

alter table public.subscriptions
  add column if not exists admin_override boolean not null default false,
  add column if not exists override_reason text,
  add column if not exists access_granted_by text,
  add column if not exists access_granted_at timestamptz,
  add column if not exists suspended_by text,
  add column if not exists suspended_reason text,
  add column if not exists suspended_at timestamptz;

create unique index if not exists idx_subscriptions_customer_unique on public.subscriptions(customer_profile_id);

create table if not exists public.customer_account_events (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.customer_profiles(id) on delete cascade,
  event_type text not null,
  severity text not null default 'info',
  note text not null,
  created_by text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.platform_users (
  id text primary key,
  email text not null unique,
  phone text,
  full_name text not null,
  role public.user_role not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.courier_profiles (
  id text primary key,
  user_id text not null unique references public.platform_users(id) on delete cascade,
  vehicle_type text not null,
  is_active boolean not null default true,
  current_status public.driver_status not null default 'offline',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.courier_profiles
  add column if not exists vehicle_registration text;

create table if not exists public.courier_accounts (
  id text primary key,
  user_id text not null unique references public.platform_users(id) on delete cascade,
  courier_profile_id text not null unique references public.courier_profiles(id) on delete cascade,
  username text not null unique,
  password_hash text not null,
  status public.hub_user_status not null default 'active',
  rating numeric(3,2) not null default 5.0,
  completed_deliveries integer not null default 0,
  weekly_earnings numeric(10,2) not null default 0,
  reward_points integer not null default 0,
  next_payout_date timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.driver_shifts (
  id text primary key,
  courier_profile_id text not null references public.courier_profiles(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  is_online boolean not null default true,
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz
);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  courier_profile_id text references public.courier_profiles(id) on delete set null,
  assigned_by_user_id text,
  status public.delivery_status not null default 'unassigned',
  assigned_at timestamptz,
  accepted_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  external_provider text,
  external_reference text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.delivery_status_history (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  actor_user_id text,
  status public.delivery_status not null,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.printers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  adapter_type public.printer_adapter_type not null default 'mock',
  config jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  printer_id uuid not null references public.printers(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  status public.print_job_status not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.customer_push_tokens (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  customer_email text,
  customer_phone text,
  token text not null unique,
  platform text not null default 'unknown',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  order_number text not null,
  customer_email text,
  channel text not null default 'push',
  event text not null,
  title text not null,
  body text not null,
  deep_link text,
  status text not null default 'queued',
  token_count integer not null default 0,
  provider_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  sent_at timestamptz
);

create table if not exists public.marketplace_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_user_id text references public.platform_users(id) on delete set null,
  category_id uuid references public.marketplace_categories(id) on delete set null,
  title text not null,
  description text not null,
  price numeric(10,2) not null,
  condition text not null,
  location_label text,
  image_urls text[] not null default '{}',
  delivery_mode text not null default 'collection',
  van_required boolean not null default false,
  collection_only boolean not null default true,
  status text not null default 'draft',
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.marketplace_seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique references public.platform_users(id) on delete cascade,
  display_name text not null,
  location_label text,
  hull_eats_plus_active boolean not null default false,
  seller_rating numeric(3,2) not null default 5.0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.marketplace_listings
  add column if not exists seller_profile_id uuid references public.marketplace_seller_profiles(id) on delete set null,
  add column if not exists buyer_user_id text references public.platform_users(id) on delete set null,
  add column if not exists accepts_offers boolean not null default true,
  add column if not exists pickup_area text,
  add column if not exists reserved_at timestamptz,
  add column if not exists sold_at timestamptz;

create table if not exists public.marketplace_listing_messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  sender_user_id text references public.platform_users(id) on delete set null,
  recipient_user_id text references public.platform_users(id) on delete set null,
  message_type text not null default 'message',
  body text not null,
  offer_amount numeric(10,2),
  status text not null default 'sent',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.marketplace_listing_orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  buyer_user_id text references public.platform_users(id) on delete set null,
  seller_user_id text references public.platform_users(id) on delete set null,
  agreed_price numeric(10,2) not null,
  delivery_mode text not null default 'collection',
  delivery_required boolean not null default false,
  van_required boolean not null default false,
  status text not null default 'pending',
  collection_address_shared boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_deliveries_order on public.deliveries(order_id);
create index if not exists idx_deliveries_status on public.deliveries(status, assigned_at desc);
create index if not exists idx_courier_accounts_status on public.courier_accounts(status, created_at desc);
create index if not exists idx_courier_profiles_status on public.courier_profiles(current_status, is_active);
create index if not exists idx_driver_shifts_courier on public.driver_shifts(courier_profile_id, started_at desc);
create index if not exists idx_delivery_status_history_delivery on public.delivery_status_history(delivery_id, created_at desc);
create index if not exists idx_printers_store on public.printers(store_id, is_active);
create index if not exists idx_print_jobs_printer on public.print_jobs(printer_id, status, created_at);
create index if not exists idx_print_jobs_order on public.print_jobs(order_id);
create index if not exists idx_customer_push_tokens_order on public.customer_push_tokens(order_id, is_active);
create index if not exists idx_customer_push_tokens_email on public.customer_push_tokens(lower(customer_email), is_active);
create index if not exists idx_customer_notifications_order on public.customer_notifications(order_id, created_at desc);
create index if not exists idx_customer_notifications_event on public.customer_notifications(event, status, created_at desc);
create index if not exists idx_customer_account_events_customer on public.customer_account_events(customer_profile_id, created_at desc);
create index if not exists idx_marketplace_categories_active on public.marketplace_categories(active, sort_order);
create index if not exists idx_marketplace_listings_category on public.marketplace_listings(category_id, active, created_at desc);
create index if not exists idx_marketplace_listings_seller on public.marketplace_listings(seller_user_id, created_at desc);
create index if not exists idx_marketplace_seller_profiles_user on public.marketplace_seller_profiles(user_id, hull_eats_plus_active);
create index if not exists idx_marketplace_listing_messages_listing on public.marketplace_listing_messages(listing_id, created_at desc);
create index if not exists idx_marketplace_listing_messages_users on public.marketplace_listing_messages(sender_user_id, recipient_user_id, created_at desc);
create index if not exists idx_marketplace_listing_orders_listing on public.marketplace_listing_orders(listing_id, status, created_at desc);
create index if not exists idx_marketplace_listing_orders_buyer on public.marketplace_listing_orders(buyer_user_id, created_at desc);

drop trigger if exists set_deliveries_updated_at on public.deliveries;
create trigger set_deliveries_updated_at before update on public.deliveries for each row execute function public.set_updated_at();

drop trigger if exists set_printers_updated_at on public.printers;
create trigger set_printers_updated_at before update on public.printers for each row execute function public.set_updated_at();

drop trigger if exists set_platform_users_updated_at on public.platform_users;
create trigger set_platform_users_updated_at before update on public.platform_users for each row execute function public.set_updated_at();

drop trigger if exists set_courier_profiles_updated_at on public.courier_profiles;
create trigger set_courier_profiles_updated_at before update on public.courier_profiles for each row execute function public.set_updated_at();

drop trigger if exists set_courier_accounts_updated_at on public.courier_accounts;
create trigger set_courier_accounts_updated_at before update on public.courier_accounts for each row execute function public.set_updated_at();

drop trigger if exists set_customer_push_tokens_updated_at on public.customer_push_tokens;
create trigger set_customer_push_tokens_updated_at before update on public.customer_push_tokens for each row execute function public.set_updated_at();

drop trigger if exists set_marketplace_categories_updated_at on public.marketplace_categories;
create trigger set_marketplace_categories_updated_at before update on public.marketplace_categories for each row execute function public.set_updated_at();

drop trigger if exists set_marketplace_listings_updated_at on public.marketplace_listings;
create trigger set_marketplace_listings_updated_at before update on public.marketplace_listings for each row execute function public.set_updated_at();

drop trigger if exists set_marketplace_seller_profiles_updated_at on public.marketplace_seller_profiles;
create trigger set_marketplace_seller_profiles_updated_at before update on public.marketplace_seller_profiles for each row execute function public.set_updated_at();

drop trigger if exists set_marketplace_listing_orders_updated_at on public.marketplace_listing_orders;
create trigger set_marketplace_listing_orders_updated_at before update on public.marketplace_listing_orders for each row execute function public.set_updated_at();

alter table public.platform_users enable row level security;
alter table public.courier_profiles enable row level security;
alter table public.courier_accounts enable row level security;
alter table public.driver_shifts enable row level security;
alter table public.deliveries enable row level security;
alter table public.delivery_status_history enable row level security;
alter table public.printers enable row level security;
alter table public.print_jobs enable row level security;
alter table public.customer_push_tokens enable row level security;
alter table public.customer_notifications enable row level security;
alter table public.customer_account_events enable row level security;
alter table public.marketplace_categories enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.marketplace_seller_profiles enable row level security;
alter table public.marketplace_listing_messages enable row level security;
alter table public.marketplace_listing_orders enable row level security;
