# Hull Eats Architecture Foundation

This foundation is now explicitly oriented around the first product priority: a premium, mobile-first customer ordering platform for Hull Eats, backed by Supabase for core data and customer identity, Stripe for payments, Render for hosting, and Expo for shipping the customer app.

## 1. Proposed Monorepo Folder Tree

```text
.
|-- apps
|   |-- admin-portal
|   |   |-- app
|   |   |-- src
|   |   `-- package.json
|   |-- api
|   |   |-- src
|   |   |   |-- common
|   |   |   |-- modules
|   |   |   `-- main.ts
|   |   `-- package.json
|   |-- courier-app
|   |   |-- src
|   |   `-- package.json
|   |-- customer-app
|   |   |-- src
|   |   `-- package.json
|   |-- customer-web
|   |   |-- app
|   |   |-- src
|   |   `-- package.json
|   |-- merchant-portal
|   |   |-- app
|   |   |-- src
|   |   `-- package.json
|   `-- worker
|       |-- src
|       `-- package.json
|-- packages
|   |-- auth
|   |   `-- src
|   |-- config
|   |   `-- src
|   |-- db
|   |   |-- prisma
|   |   `-- src
|   |-- dispatch-engine
|   |   `-- src
|   |-- printer
|   |   `-- src
|   |-- sdk
|   |   `-- src
|   |-- types
|   |   `-- src
|   `-- ui
|       `-- src
|-- docs
|   `-- architecture.md
|-- docker-compose.yml
|-- package.json
|-- pnpm-workspace.yaml
`-- tsconfig.base.json
```

## 2. Architecture Overview

- Modular monolith for v1: one deployable API and one worker process backed by a single PostgreSQL database and Redis.
- Customer experience is the lead product surface. The first-class flows are store discovery, menu browsing, basket, checkout, and order tracking on mobile.
- Hull Eats ships as both a responsive website and a native-style mobile app.
- Responsive web should behave like an app on phones first, then scale upward to tablet and desktop rather than the other way around.
- Supabase Postgres is the primary transactional datastore for customers, catalog, inventory, orders, and payment records.
- Supabase Auth is the preferred customer identity layer, with customer profiles mapped into application tables.
- Stripe handles payment collection, Apple Pay, Google Pay, and webhook-based payment state confirmation.
- Render hosts the API, worker, responsive web app, and Redis-compatible Key Value instance.
- Backend-managed commerce data drives every customer surface: merchant configuration, store presentation, menus, prices, stock, item visibility, availability windows, and image assets.
- Clean boundaries at the module and package level keep future delivery-provider integrations optional instead of shaping the core ordering platform too early.
- Shared contracts live in `packages/types`, infrastructure concerns live in focused packages, and apps consume a typed SDK rather than reimplementing request logic.
- Realtime is centered on order lifecycle events. The API is the source of truth, Redis supports queueing and pub/sub style fan-out, and WebSockets deliver status changes to customer, merchant, admin, and courier clients.

## 3. Core Domain and Module Boundaries

### Domain modules in `apps/api`

- `identity`: users, authentication, sessions, RBAC, actor context.
- `customers`: customer profiles, address book, order history, Supabase identity mapping.
- `catalog`: merchants, stores, menus, categories, items, modifiers, operating hours, item merchandising.
- `inventory`: stock tracking, sellable quantity, availability state, out-of-stock behavior.
- `media`: store imagery, item imagery, upload metadata, storefront presentation assets.
- `ordering`: baskets, checkout validation, orders, order items, pricing snapshots.
- `payments`: Stripe customer mapping, payment intents, payment records, webhook ingestion.
- `merchant-ops`: merchant order inbox, accept/reject actions, prep-time updates.
- `dispatch`: driver availability, assignment decisions, delivery handoff.
- `delivery`: courier workflow, pickup/delivered transitions, proof/status timestamps.
- `zones`: delivery zones, pricing constraints, serviceability checks.
- `printering`: print job creation and adapter routing.
- `realtime`: websocket channels, event fan-out, subscription auth.
- `admin`: back-office creation and management flows across all entities.
- `integrations`: reserved boundary for future external delivery providers.

### Shared packages

- `packages/types`: enums, DTOs, event payloads, status models, validation schemas.
- `packages/db`: Prisma schema, client factory, seeds.
- `packages/auth`: role helpers, permissions, policy checks, request actor typing.
- `packages/config`: validated environment config.
- `packages/dispatch-engine`: assignment policies and dispatch interfaces.
- `packages/printer`: printer contracts and mock adapter.
- `packages/sdk`: typed HTTP/WebSocket client surface.
- `packages/ui`: lightweight shared UI primitives for the web apps.

## 4. Initial Database Schema

Core tables:

- `users`, `merchant_memberships`, `courier_profiles`
- `customer_profiles`, `customer_addresses`
- `merchants`, `stores`, `store_hours`, `delivery_zones`
- `media_assets`
- `menu_categories`, `menu_items`, `menu_item_availability`
- `inventory_adjustments`
- `orders`, `order_items`, `order_status_history`
- `payments`, `payment_events`
- `deliveries`, `delivery_status_history`, `driver_shifts`
- `printers`, `print_jobs`
- `outbox_events`

Modeling decisions:

- One merchant can own multiple stores.
- Customers are represented separately from internal staff and are linked to Supabase Auth through `supabaseAuthUserId`.
- Customer addresses live as reusable address-book records, while orders still snapshot the delivery address for historical accuracy.
- Stripe data is stored only as references and lifecycle state, not raw card details.
- Stores and menu items carry presentation data for customer channels, but the values are still managed by backend/admin tooling.
- Menu items support image assets, stock tracking, stock counts, and frontend merchandising flags without needing a separate inventory service for v1.
- Inventory movements are captured in an adjustment ledger to support stock auditing and future forecasting.
- Orders snapshot pricing and item names at purchase time.
- Delivery is a separate aggregate from order so manual dispatch and future third-party providers can slot in cleanly.
- Status history tables preserve auditability and power realtime replay.

See `packages/db/prisma/schema.prisma` for the executable schema.

## 5. API Route Plan

### Public customer routes

- `GET /v1/public/stores`
- `GET /v1/public/stores/:storeId`
- `GET /v1/public/stores/:storeId/menu`
- `GET /v1/public/stores/:storeId/categories`
- `GET /v1/public/stores/:storeId/items`
- `POST /v1/public/orders/quote`
- `POST /v1/public/orders`
- `GET /v1/public/orders/:orderId/track`

### Customer account routes

- `GET /v1/customer/me`
- `GET /v1/customer/me/addresses`
- `POST /v1/customer/me/addresses`
- `GET /v1/customer/me/orders`

### Payment routes

- `POST /v1/payments/intents`
- `POST /v1/payments/webhooks/stripe`

### Merchant routes

- `GET /v1/merchant/orders`
- `GET /v1/merchant/orders/:orderId`
- `GET /v1/merchant/catalog/items`
- `PATCH /v1/merchant/catalog/items/:itemId`
- `PATCH /v1/merchant/catalog/items/:itemId/stock`
- `POST /v1/merchant/orders/:orderId/accept`
- `POST /v1/merchant/orders/:orderId/reject`
- `POST /v1/merchant/orders/:orderId/prep-time`
- `POST /v1/merchant/orders/:orderId/print`

### Admin routes

- `POST /v1/admin/merchants`
- `POST /v1/admin/stores`
- `PATCH /v1/admin/stores/:storeId`
- `POST /v1/admin/stores/:storeId/menu-items`
- `PATCH /v1/admin/menu-items/:itemId`
- `POST /v1/admin/media`
- `POST /v1/admin/stores/:storeId/zones`
- `POST /v1/admin/drivers`
- `GET /v1/admin/orders`
- `POST /v1/admin/orders/:orderId/assign-driver`

### Courier routes

- `GET /v1/courier/jobs`
- `POST /v1/courier/deliveries/:deliveryId/accept`
- `POST /v1/courier/deliveries/:deliveryId/picked-up`
- `POST /v1/courier/deliveries/:deliveryId/delivered`

### Internal routes

- `GET /v1/health`
- `GET /v1/realtime/token`

## 6. Event and Realtime Plan

Canonical domain events:

- `order.created`
- `order.accepted`
- `order.rejected`
- `order.prep_time_updated`
- `order.ready_for_dispatch`
- `delivery.assigned`
- `delivery.accepted`
- `delivery.picked_up`
- `delivery.delivered`
- `printjob.created`
- `printjob.completed`
- `printjob.failed`

Implementation plan:

- Persist events in `outbox_events` inside the same DB transaction as state changes.
- Worker drains the outbox, publishes to Redis-backed queues, and triggers websocket fan-out.
- WebSocket namespaces:
  - customer tracking channel per order
  - merchant store inbox channel per store
  - admin ops channel
  - courier channel per driver

## 7. Queue and Worker Plan

BullMQ queues:

- `order-events`: publish domain events and update websockets.
- `print-jobs`: render/dispatch print requests through printer adapters.
- `notifications`: reserved for SMS/email/push later.
- `dispatch-updates`: recalculate assignment views and courier task lists.

Worker responsibilities:

- outbox processing
- print job execution
- delivery assignment side effects
- future notification delivery

## 8. Printer Abstraction Design

Contracts:

- `PrinterAdapter`: send raw payload, structured receipt payload, and health check.
- `PrinterRegistry`: resolve printer adapter by store printer configuration.
- `PrintJobPayload`: normalized order slip model independent of printer vendor.

Adapters:

- `MockPrinterAdapter` for v1 and local development.
- Future adapters can target network ESC/POS, Star, Epson, or cloud print bridges without touching order flow code.

## 9. Local Development Setup Using Docker

- Docker Compose provisions PostgreSQL and Redis.
- Apps run on the host with hot reload for a faster inner loop.
- API defaults to `http://localhost:4000`.
- Customer app uses Expo locally and EAS for production builds.
- Customer web defaults to `http://localhost:3000`.
- Merchant portal defaults to `http://localhost:3001`.
- Admin portal defaults to `http://localhost:3002`.

## 9b. Production Deployment

- GitHub is the source repo and deployment trigger source
- Render hosts:
  - customer web
  - API
  - worker
  - Redis-compatible Key Value
- Supabase hosts:
  - Postgres
  - Auth
  - Storage
- Stripe hosts:
  - customer payment methods
  - payment intents
  - webhook event delivery
- Expo EAS handles iOS and Android build/distribution

## 10. Phased Implementation Roadmap

### Phase 1

- repo bootstrap
- shared contracts
- Prisma schema
- Supabase and Stripe env foundation
- auth and RBAC foundation
- public store browsing
- customer profile and address book
- order placement and payment intent creation

### Phase 2

- merchant order inbox
- accept/reject/prep time flow
- websocket tracking
- mock printer jobs

### Phase 3

- admin order console
- manual driver assignment
- courier app workflow
- delivery tracking

### Phase 4

- reporting
- hardened auditing
- notification channels
- integration adapters behind interfaces

## 11. Seed Data Plan

- one demo merchant with two stores
- one restaurant menu and one shop menu
- store logos, cover images, and item images
- mixed inventory states: in stock, low stock, out of stock
- one Supabase-linked customer profile
- one reusable customer address
- one Stripe-backed successful web order and one successful app order
- one admin user
- one merchant manager user
- two active drivers
- one delivery zone per store
- one sample printer per store using mock adapter
- sample accepted and in-delivery orders for UI development

## 12. Repo Bootstrap Code Foundation

The repo includes:

- starter app shells for customer, merchant, admin, courier, API, and worker
- a dedicated `customer-app` Expo shell for App Store / Play Store delivery
- shared packages for config, types, DB, auth, dispatch, printer, SDK, and UI
- executable Prisma schema and seed script
- NestJS module skeletons
- Next.js and Expo entry points

## 13. Test Strategy for Ordering Flow

- unit tests for pricing, stock deduction, availability rules, RBAC, status transitions, dispatch rules, and printer payload shaping
- integration tests for checkout, Supabase-backed customer lookups, Stripe payment intent creation, stock-aware ordering, merchant accept/reject, manual assignment, and courier delivery transitions
- end-to-end happy path covering mobile customer browsing through delivered status with websocket assertions
- contract tests for SDK clients and printer adapters
