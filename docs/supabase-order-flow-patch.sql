-- Hull Eats order flow patch
-- Paste this into the Supabase SQL editor for existing databases.
-- It aligns the live checkout, merchant hub orders, receipt printing, and courier tracking schema.

do $$
begin
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

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  courier_profile_id text,
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

create index if not exists idx_deliveries_order on public.deliveries(order_id);
create index if not exists idx_deliveries_status on public.deliveries(status, assigned_at desc);
create index if not exists idx_delivery_status_history_delivery on public.delivery_status_history(delivery_id, created_at desc);
create index if not exists idx_printers_store on public.printers(store_id, is_active);
create index if not exists idx_print_jobs_printer on public.print_jobs(printer_id, status, created_at);
create index if not exists idx_print_jobs_order on public.print_jobs(order_id);

drop trigger if exists set_deliveries_updated_at on public.deliveries;
create trigger set_deliveries_updated_at before update on public.deliveries for each row execute function public.set_updated_at();

drop trigger if exists set_printers_updated_at on public.printers;
create trigger set_printers_updated_at before update on public.printers for each row execute function public.set_updated_at();

alter table public.deliveries enable row level security;
alter table public.delivery_status_history enable row level security;
alter table public.printers enable row level security;
alter table public.print_jobs enable row level security;
