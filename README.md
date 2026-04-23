# Hull Eats Platform

Mobile-first MVP monorepo for Hull Eats, a multi-merchant ordering platform serving restaurants, takeaways, and shops through a premium customer app experience and a responsive mobile web storefront.

## Stack

- TypeScript across all apps and packages
- `pnpm` workspaces + Turborepo
- Next.js for the responsive customer website and web admin surfaces
- Expo React Native for the customer mobile app and courier app
- NestJS for the backend API and worker
- Supabase Postgres + Prisma for relational data
- Supabase Auth for customer identity
- Supabase Storage for media assets
- Stripe for payments
- Render for web, API, worker, and Redis-compatible Key Value
- Redis + BullMQ for queues and realtime fan-out support
- WebSockets for live order tracking
- Docker Compose for local infrastructure

## Product Direction

- Customer ordering comes first: mobile-first UX, fast browsing, clean checkout, live tracking
- The customer app is a first-class product alongside the responsive web storefront
- Responsive web is a first-class channel and should feel close to a native app on phones
- Supabase-backed Postgres is the source of truth for customers, orders, catalog, inventory, and media metadata
- Stripe handles payment collection and confirmation so Hull Eats does not store raw card details
- Merchant/admin tooling exists to control the storefront rather than duplicate storefront logic
- Delivery and printer flows stay modular, but the first build priority is the ordering platform itself

## Monorepo Layout

```text
apps/
  admin-portal/
  api/
  courier-app/
  customer-app/
  customer-web/
  merchant-portal/
  worker/
packages/
  auth/
  config/
  db/
  dispatch-engine/
  printer/
  sdk/
  types/
  ui/
docs/
  architecture.md
```

## Quick Start

1. Copy `.env.example` to `.env`.
2. In Supabase SQL Editor, run [docs/supabase-bootstrap.sql](/C:/Hull_Eats/docs/supabase-bootstrap.sql).
3. Start local infrastructure with `pnpm docker:up`.
4. Install dependencies with `pnpm install`.
5. Generate the Prisma client with `pnpm db:generate`.
6. Run migrations with `pnpm db:migrate`.
7. Seed the database with `pnpm db:seed`.
8. Start the core apps:
   - API: `pnpm --filter @hull-eats/api dev`
   - Worker: `pnpm --filter @hull-eats/worker dev`
   - Customer app: `pnpm --filter @hull-eats/customer-app dev`
   - Customer web: `pnpm --filter @hull-eats/customer-web dev`
   - Merchant portal: `pnpm --filter @hull-eats/merchant-portal dev`
   - Admin portal: `pnpm --filter @hull-eats/admin-portal dev`
   - Courier app: `pnpm --filter @hull-eats/courier-app dev`

## Production Hosting

- GitHub stores the monorepo and drives Render auto-deploys
- Render hosts the API, worker, customer web, and Redis-compatible Key Value
- Supabase hosts Postgres, Auth, and Storage
- Stripe handles all payment flows
- Expo EAS builds and submits the customer app to Apple App Store and Google Play

## Core MVP Flow

1. Admin or merchant creates merchants, stores, menus, images, prices, stock rules, and delivery zones.
2. Customer browses stores, categories, and items on a mobile-first Hull Eats storefront.
3. Merchant accepts or rejects the order and updates prep time.
4. Merchant can print via the printer abstraction.
5. Admin manually assigns the order to an active driver.
6. Driver accepts pickup, marks picked up, and marks delivered.
7. Customer tracks order and delivery updates in real time.

## MVP Scope Focus

- Premium mobile-first storefront for discovery, menu browsing, basket, and checkout
- Backend-managed catalog with stock-aware item availability
- Merchant/admin control of pricing, item status, and imagery
- Customer accounts, addresses, and order history backed by Supabase
- Stripe payment intents and webhook-driven payment confirmation
- Real-time order tracking once checkout is complete

## Architecture Docs

See [docs/architecture.md](/C:/Hull_Eats/docs/architecture.md) for:

- architecture overview
- module boundaries
- database schema
- route plan
- realtime events
- queue design
- printer abstraction
- roadmap
- seed plan
- testing strategy

See [docs/deployment.md](/C:/Hull_Eats/docs/deployment.md) for:

- Render blueprint and service layout
- Supabase + Stripe environment model
- recommended production deployment structure

See [docs/supabase-bootstrap.sql](/C:/Hull_Eats/docs/supabase-bootstrap.sql) for:

- customer profile and address schema
- marketplace business/store schema
- onboarding-friendly catalog foundations
- checkout, order, and payment tables
- starter RLS policies
