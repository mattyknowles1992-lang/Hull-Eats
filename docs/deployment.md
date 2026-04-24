# Hull Eats Deployment Model

## Recommended Production Stack

- GitHub for source control, pull requests, and Render auto-deploy integration
- Render for:
  - `apps/customer-web`
  - `apps/merchant-portal`
  - `apps/admin-portal`
  - `apps/api`
  - `apps/worker`
  - Redis-compatible Key Value for queues and realtime fan-out
- Supabase for:
  - Postgres database
  - customer authentication
  - customer profile storage
  - address book data
  - image/media storage
- Stripe for:
  - card payments
  - Apple Pay
  - Google Pay
  - payment intents and webhook confirmation
- Expo + EAS for shipping `apps/customer-app` to Apple App Store and Google Play

## Why This Is The Better Structure

- One primary transactional database in Supabase keeps customers, catalog, inventory, and orders consistent
- Stripe handles all sensitive payment collection so Hull Eats never stores raw card data
- Render is a strong fit for the API, worker, and responsive website, while mobile builds remain an app-store concern
- GitHub remains the single integration point for CI/CD and infrastructure-as-code through `render.yaml`

## Customer Data Model

Store in Supabase-backed Postgres:

- customer profile
- email
- phone
- addresses
- order history
- Stripe customer reference
- payment records and webhook event audit

Do not store:

- full card numbers
- CVC values
- raw expiry details

## Render Services

Defined in [render.yaml](/C:/Hull_Eats/render.yaml):

- `hull-eats-customer-web`
- `hull-eats-merchant-portal`
- `hull-eats-admin-portal`
- `hull-eats-api`
- `hull-eats-worker`
- `hull-eats-redis`

## Environment Layout

### Shared backend env

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `DEFAULT_CURRENCY`

### Web client env

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Software portal env

- `NEXT_PUBLIC_API_URL`

The admin portal and merchant portal are deployed as separate web services. They do not own customer storefront state directly; they authenticate against the API and read/write hub, user, business settings, menu, import, order, and printer data through API routes backed by Postgres.

### Mobile app env

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## Operational Notes

- Render hosts the website and backend, not the mobile app store binaries
- Expo EAS should handle build profiles, signing, and submission for iOS and Android
- Stripe webhooks should be treated as the final source of truth for payment success or failure
- Supabase Row Level Security should protect customer-facing tables once the real auth flow is wired in
