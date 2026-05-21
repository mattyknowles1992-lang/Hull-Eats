# Hull Eats Agent Handoff

This file is the first-read instruction set for future agents working on Hull Eats.

Hull Eats is not a single website. It is a multi-app ordering and business software platform with separate deployable surfaces that communicate through the backend API and shared database. Keep these boundaries intact.

## Product Vision

Hull Eats is a local ordering, delivery, and restaurant operations platform built around three key pillars.

The three key pillars are:

- Marketplace for buyers: customers browse businesses, build baskets, pay, and track orders.
- Portal for businesses: Hull Eats admins create and manage business hubs; businesses log into their own hub to configure menus, delivery settings, users, order handling, printing, and future add-on packages.
- Courier app for Hull Eats couriers: Hull Eats couriers receive delivery work, manage pickup/drop-off status, and support the real-world delivery operation.

The business/admin portals must be configurable and deployable in their own right. They are software portals, not part of the public customer storefront.

Future agents should protect these three pillars as separate but connected products. They share the same API, database, order lifecycle, and operational data, but each has its own user type, workflow, and deployable surface.

The platform must support modular rollout. A business/customer may want the full Hull Eats stack, but Hull Eats must also be able to offer individual systems without unnecessary coupling:

- Marketplace only: buyer ordering and storefront without requiring Hull Eats courier operations.
- Business portal only: business software for menu/order/admin operations without forcing marketplace or courier rollout.
- Courier/delivery only: Hull Eats courier dispatch and delivery operations for businesses that only want delivery support.
- Full stack: marketplace, business portal, and Hull Eats courier app working together as one operational flow.

Design new features so each pillar can stand alone where possible, and integrate cleanly when a customer chooses multiple pillars.

## Current App Boundaries

### `apps/customer-web`

Public responsive customer website.

Purpose:

- Store discovery
- Store menu browsing (including sold-out labelling; hidden merchant items are filtered by the API)
- Basket and checkout
- Customer registration/sign-in through Supabase
- Customer order tracking
- Hull Marketplace and Hull Services entry points (separate surfaces; shared top-bar auth pattern)

**Customer accounts (current):**

- Full signup at `/register` via `register-form.tsx` → `supabase.auth.signUp` with profile/address metadata.
- Sign-in at `/account` (`account-client.tsx`). Homepage auth uses `marketplace-auth-buttons.tsx`: signed-out users see **Sign in / Sign up**; signed-in users see **Your account** only.
- **Hull Eats+ / paid delivery plans are not offered at signup** (metadata still sends `preferred_delivery_plan: "pay_as_you_go"` for DB compatibility). Do not reintroduce plan pickers without product approval.
- Persisted customer rows (`customer_profiles`, `customer_addresses`, etc.) are created by Supabase triggers in `docs/supabase-bootstrap.sql`. The admin API lists customers via `CustomerRegistryService` (`/v1/admin/customers`). Both the API `DATABASE_URL` and Supabase project must match for admin lists to populate.

This app should not own business configuration state. It reads live marketplace data produced by the API/database.

### `apps/customer-app`

Expo React Native customer mobile app.

Purpose:

- Native/mobile customer ordering experience
- Same customer-facing domain as `customer-web`

Keep it aligned with customer-web behavior, but do not put admin or merchant tooling here.

### `apps/admin-portal`

Hull Eats internal admin portal.

Purpose:

- Hull Eats staff/admin login
- Create business hubs
- Provision owner login credentials
- Create additional hub users
- View and manage all hubs
- Delete/disable hubs where appropriate
- Courier/admin operations as the product matures
- Future package/add-on assignment per business

Important current route:

- `/headminhe` is the internal admin console surface.

This portal should only talk to the API. It should not directly mutate local/demo data for business-critical flows.

### `apps/merchant-portal`

Business software portal for restaurants, takeaways, and shops.

Purpose:

- Business hub login using email or username plus password
- Fetch the authenticated hub workspace from the API
- Manage business/store settings
- Configure delivery fee, minimum order, ETA, and open/live status
- **Menu Studio** (draft menu editing, then one **Save & publish menu** action)
- Build item ingredients/components and customer option groups
- Stage menu imports for review
- Create/remove business users (owner/manager/staff/**viewer**; owners create logins; **viewer** is browse-only)
- Order inbox and operational panels (accept/reject, drivers, promotions, config snapshots)
- Future paperless kitchen screen, printing, add-ons, and integrations

**Menu Studio implementation (current):**

- UI modules live under `apps/merchant-portal/app/`:
  - `hub-menu-studio.tsx` — main menu builder surface
  - `hub-menu-customisation.tsx` — components and option groups
  - `hub-menu-publish-dialog.tsx` — publish confirmation
  - `menu-studio-core.ts` — draft IDs, availability modes, publish checklist/summary (no API calls)
- Categories/items are edited **locally in portal state** until publish. Create/delete category/item no longer hits per-item API routes during editing.
- **Save & publish menu** calls `PUT` hub workspace (`saveWorkspace`) with full `menuSections` + `settings`. The API persists menu via `hub-registry.service.ts` → `persistHubMenuSections`.
- **Item visibility:** `live` (`isActive: true`, in stock), `sold_out` (`isActive: true`, `stockStatus: out_of_stock`), `hidden` (`isActive: false`). New items default to **hidden** until marked live and published.
- **Customer-facing menus** (`marketplace-catalog.ts` / `findLiveMarketplaceMenu`) only return `menuItems` where `isActive: true`. Sold-out items stay visible on the store menu with ordering disabled (`store-menu-client.tsx`).
- **Menu import apply** still writes hidden rows to Postgres immediately; owners must set items live and publish for buyers to see them.
- `beforeunload` warns when there are unsaved hub/menu edits.

**Hub roles (`packages/types/src/hub-access.ts`):**

| Role | Menu/settings save | Orders (accept/reject/print) | Create/remove users |
|------|---------------------|------------------------------|---------------------|
| owner | yes | yes | yes |
| manager | yes | yes | no |
| staff | no | yes | no |
| viewer | no | no | no |

Enforced in `apps/api/src/common/hub-permissions.ts` + `merchant.controller.ts` (token `role` claim) and mirrored in merchant portal UI (disabled save, menu studio read-only for viewer, owner-only user admin).

This app must remain separate from the customer apps and deploy as its own service. It is the business-facing software product.

### `apps/api`

NestJS backend API.

Purpose:

- Auth/session endpoints for admin and merchant portals
- Business hub provisioning
- Hub workspace fetch/update
- Menu/category/item persistence
- Customer checkout/order APIs
- Payment integration
- Order operations
- Dispatch/courier APIs
- Printer APIs
- Future AI phone, kiosk, and third-party ordering integrations

The API is the boundary between portals/apps and the database. Future portal work should add/extend API routes rather than storing important state in the frontend.

### `apps/worker`

Background worker.

Purpose:

- Queue processing
- Realtime fan-out support
- Future async jobs such as notifications, printer retries, third-party order sync, AI call follow-up, webhooks, and import processing

### `apps/courier-app`

Courier mobile app.

Purpose:

- Courier login/workflow
- Delivery assignment
- Pickup and delivered transitions
- Future live location/status updates

## Shared Packages

### `packages/types`

Shared DTOs, Zod schemas, enums, and contract types.

Update this first when changing API request/response shapes. Keep portals and API using the same contracts.

### `packages/db`

Prisma schema/client and seed data.

The important hub/business models include:

- `Merchant` mapped to `businesses`
- `Store`
- `HubUser`
- `MenuCategory`
- `MenuItem`
- `DeliveryZone`
- `Order`
- `Printer`

### `packages/auth`

Internal auth helpers:

- Password hashing/verification
- Session token signing/verification
- Role and permission helpers

Hub passwords must never be stored as plaintext. Use the existing hashing helpers or a deliberate production replacement.

### `packages/printer`

Printer contracts and mock adapter.

Current printing is not production hardware integration yet.

### `packages/dispatch-engine`

Dispatch assignment logic.

### `packages/sdk`

Shared SDK/demo marketplace data. Prefer typed API clients here as the platform matures.

### `packages/ui`

Shared UI primitives.

## Current Hub Flow

The intended flow is:

1. Hull Eats admin signs into `apps/admin-portal`.
2. Admin creates a business hub with only the business name, login email, and temporary password.
3. API creates a persisted business, store, and owner `HubUser`.
4. The login email is also used as the hub username, and the password is hashed before storage.
5. Business owner signs into `apps/merchant-portal` with email and password.
6. API returns a merchant session token and the hub workspace.
7. Merchant portal fetches hub workspace, edits menu **in draft**, then **publishes** the full workspace (settings + `menuSections`) through the API.
8. Customer apps read the resulting live marketplace/store/menu data from the API/database (`isActive: true` items only on live storefronts).

Do not collapse this into one app. The admin portal and merchant portal need their own deployment/configuration because they are business software surfaces.

## Deployment Shape

The Render blueprint should treat these as separate services:

- `hull-eats-api`
- `hull-eats-worker`
- `hull-eats-customer-web`
- `hull-eats-merchant-portal`
- `hull-eats-admin-portal`
- `hull-eats-redis`

The portals connect to the API using:

- `NEXT_PUBLIC_API_URL`

Customer web also uses public Supabase/Stripe variables where needed.

## Data Ownership Rules

- Postgres/Supabase is the source of truth.
- The API is the write boundary.
- Customer apps must not manage merchant configuration.
- Merchant portal must only access the authenticated hub.
- Admin portal can access all hubs, but only through admin-authenticated API routes.
- Demo data is acceptable for previews, but do not build new core flows that only live in demo arrays.
- If a feature affects live orders, live menus, credentials, pricing, business identity, packages, payments, or delivery settings, persist it through the API/database.

## Security Requirements

Current auth is MVP-level internal auth. Improve it carefully over time.

Required direction:

- Hash all hub passwords.
- Never return password hashes to the frontend.
- Prefer invite/reset flows over showing reusable temporary passwords long-term.
- Enforce hub scoping on every merchant route.
- Add rate limiting to login endpoints before production use.
- Add audit logs for admin actions, user creation, hub deletion, menu publishing, package changes, and order changes.
- Move bootstrap-only admin auth into persistent internal admin accounts before serious production rollout.

## Business Software Scope

The merchant/business portal should eventually include:

- Business profile
- Opening hours
- Delivery fees/zones
- Delivery/prep time settings
- Menu categories
- Menu items
- Ingredients/components
- Modifier/option groups
- Allergens and dietary flags
- Stock and item availability
- Order inbox
- Accept/reject orders
- Prep-time updates
- Mark ready/out for delivery/delivered
- Print order tickets
- Paperless kitchen mode
- Digital order verification
- Staff/user management
- Package/add-on management visibility

The admin portal should eventually include:

- Create/edit/disable hubs
- Create/edit/disable business users
- Assign package/add-on plans
- Manage global support/admin users
- View all orders
- Support businesses
- Manage couriers and delivery zones
- Manage platform notices
- Monitor integrations and failed jobs
- Audit log review

## Future Add-On Package Scope

The platform is expected to support optional packages/add-ons. These are not fully built yet.

Planned add-ons:

- AI phone order handler
- AI phone order-status handler
- Ordering kiosk software
- Paperless kitchen/order screen
- Ticket printer support
- Multi-app order management
- Hull Eats managed Just Eat/Uber Eats/Deliveroo workflows where API access allows
- Live map tracking
- Advanced analytics

Do not hard-code these as UI-only toggles. Model them as persisted package/add-on entitlements assigned to businesses, then gate UI/API behavior from those entitlements.

## AI Phone Handler Direction

Future AI phone features should integrate with the same order/menu/business data as the portal.

Expected flows:

- Customer calls business/Hull Eats number.
- AI can take an order using the live menu and item options.
- AI confirms order details, delivery/collection info, and customer phone/address.
- Order is created in the same order system as web/app orders.
- If a customer calls for an update, AI asks for order number or phone number.
- API looks up order status and ETA.
- AI responds using live order data.

This should be a backend/API integration, not frontend-only logic.

## Third-Party Marketplace Direction

Multi-app management is planned but not fully built.

Goal:

- Pull orders from platforms such as Just Eat, Uber Eats, and Deliveroo where technically and legally allowed.
- Show external orders inside Hull Eats order management.
- Let businesses manage/print/process orders in one place.
- Preserve source/platform metadata on each order.

Build this behind an `integrations` boundary. Expect provider-specific API limitations.

## Development Rules For Future Agents

- Read this file before changing architecture.
- Respect app boundaries.
- Prefer API-backed persistence over local frontend state.
- Update `packages/types` when API contracts change.
- Update Prisma schema and migrations/bootstrap SQL when persistence changes.
- Keep merchant data scoped by hub/business ID.
- Do not put customer app logic into the merchant/admin portals.
- Do not put portal-only admin controls into customer apps.
- Do not expose secrets or password hashes to frontend code.
- Keep deployment docs and `render.yaml` aligned when adding/removing deployable apps.
- Run targeted typechecks after changes.

Recommended verification commands:

```powershell
corepack pnpm --filter @hull-eats/types typecheck
corepack pnpm --filter @hull-eats/api typecheck
corepack pnpm --filter @hull-eats/admin-portal typecheck
corepack pnpm --filter @hull-eats/merchant-portal typecheck
corepack pnpm --filter @hull-eats/customer-web typecheck
```

Use `corepack pnpm ...` on machines where `pnpm` is not directly on PATH.

**Database (loads `Hull_Eats/.env` automatically):**

```powershell
corepack pnpm db:check    # verify .env, migrations, core tables, viewer role
corepack pnpm db:deploy   # apply pending Prisma migrations
corepack pnpm db:status   # show migration status only
```

Set `DATABASE_URL_DIRECT` in `.env` (Supabase direct URI, port 5432) for reliable `db:deploy` / `db:check`. Keep `DATABASE_URL` as the pooler URL for the API on Render. See `.env.example`.

## Known Gaps

These areas are not complete and should be treated as future work unless the user asks for them directly:

- Production-grade admin account system
- Invite/password reset flow
- Package/add-on entitlement tables and UI
- Real order inbox persistence in the merchant portal
- Production printer integration
- Paperless kitchen mode
- AI phone integrations
- Kiosk app/software
- Third-party order aggregation
- Full audit logging
- Further RBAC polish (e.g. read-only delivery/offers panels, audit log of permission denials)
- Rate limiting and account lockout
- Full live courier/location tracking
- Hull Marketplace resale: Prisma tables `resale_*` (listings, conversations, messages, offers, purchases, reviews, resolution cases) and migrations `20260511180000_resale_marketplace`, `20260511190000_resale_reviews_resolution`; public HTTP APIs for publish, threads, offers, paid/not-sold, mandatory buyer reviews, seller trust metrics, and resolution cases are still to be built
- Customer web: `NEXT_PUBLIC_MARKETPLACE_LISTING_REQUIRES_HULL_EATS_PLUS` (default false) gates listing copy and sell form; set `true` when Hull Eats+ listing rules go live
- Merchant menu import: accepted import rows persist immediately as hidden DB items; a future improvement is pure draft imports until publish
- Deploy menu-studio changes together: `hull-eats-api`, `hull-eats-merchant-portal`, and `hull-eats-customer-web` (sold-out UI + publish pruning)

## User Direction To Preserve

The user wants the software portal separated so it can be introduced/deployed only into businesses. Hull Eats admins should create a hub using only business name, login email, and temporary password; all business setup such as menu, delivery lead time, pricing, descriptions, and other settings belongs inside the hub portal after login. The portal may remain a web app first, but it should be treated as standalone software that is configured and deployed in its own right.
