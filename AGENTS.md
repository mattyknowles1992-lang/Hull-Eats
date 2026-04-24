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
- Store menu browsing
- Basket and checkout
- Customer registration/sign-in through Supabase
- Customer order tracking

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
- Create and edit menu categories
- Create and edit menu items
- Build item ingredients/components and customer option groups
- Stage menu imports for review
- Create/remove business users
- Future order inbox, paperless kitchen screen, printing, add-ons, and integrations

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
2. Admin creates a business hub with business name, owner name, owner email, username, temporary password, business type, and default delivery lead time.
3. API creates a persisted business, store, and owner `HubUser`.
4. Password is hashed before storage.
5. Business owner signs into `apps/merchant-portal` with email or username and password.
6. API returns a merchant session token and the hub workspace.
7. Merchant portal fetches/saves hub settings, users, categories, menu items, and menu imports through the API.
8. Customer apps read the resulting live marketplace/store/menu data from the API/database.

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
- Fine-grained RBAC
- Rate limiting and account lockout
- Full live courier/location tracking

## User Direction To Preserve

The user wants the software portal separated so it can be introduced/deployed only into businesses. Hull Eats admins should be able to create a hub, set the business name, owner/login details, and let that business log into its hub from any machine. The portal may remain a web app first, but it should be treated as standalone software that is configured and deployed in its own right.
