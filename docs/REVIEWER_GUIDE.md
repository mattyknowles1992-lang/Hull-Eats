# Guide for code reviewers

This document is for engineers evaluating Hull Eats before investment, partnership, or hire. It explains what is intentional versus what is still evolving.

## What this repo is

Hull Eats is a **multi-app ordering and operations platform** (not a single website):

| App | Role |
|-----|------|
| `apps/customer-web` | Public storefront and checkout |
| `apps/merchant-portal` | Business hub software (menu, settings, orders) |
| `apps/admin-portal` | Hull Eats internal provisioning |
| `apps/api` | NestJS API — write boundary to Postgres |
| `apps/worker` | Queues and async work |
| `apps/courier-app` | Courier deliveries |

Shared contracts live in `packages/types`. Hub passwords are hashed in `packages/auth`; customer identity uses Supabase Auth.

## How to verify quality quickly

```powershell
pnpm install
pnpm typecheck
pnpm test
```

Tests today focus on **high-risk pure logic**: password hashing, locale normalization, merchant-facing error copy, workspace settings normalization, and menu item normalization. They are the baseline for growing integration coverage.

## Merchant portal layout (refactor in progress)

The merchant UI was built quickly around a single route. It is being split without changing behaviour:

| Module | Responsibility |
|--------|----------------|
| `app/page.tsx` | React shell, navigation, section UI |
| `app/merchant-api.ts` | Typed `fetch` calls to the API |
| `app/merchant-session.ts` | Browser session persistence |
| `app/merchant-workspace-state.ts` | Hub settings snapshots and normalization |
| `app/menu-studio-core.ts` | Menu draft rules, publish, encoded category metadata |
| `app/hub-merchant-errors.ts` | User-facing API error messages |

`page.tsx` is still large because Menu Studio UI remains there; API and session concerns are already extracted.

## Intentional MVP tradeoffs (not oversights)

1. **Menu builder metadata** — Some advanced menu config is stored in category/item description fields behind `__HULL_*` markers to ship fast without dozens of migrations. Customer-facing text strips these markers. A future phase can move this to JSON columns.

2. **Hub auth** — Merchant/admin hubs use signed bearer tokens (session in `localStorage` for now). Rate limiting, refresh tokens, and invite flows are on the roadmap (`AGENTS.md` known gaps).

3. **Dual auth** — Customers: Supabase. Hubs: API-issued tokens. Unifying is a product decision, not a missing import.

4. **`hub-registry.service.ts` size** — Central hub persistence service; splitting by domain (menu vs orders vs users) is planned as order volume grows.

## What we will not apologise for

- **Monorepo + Turborepo** — Appropriate for multiple deployables.
- **Draft-then-publish menus** — Correct product model for restaurants.
- **Separate deployables on Render** — Matches modular rollout (marketplace-only vs portal-only).

## Red flags we agree should improve over time

- Broader automated tests (checkout, workspace PATCH, RBAC).
- **Tenancy integration tests** (hub A token cannot access hub B) — see [TENANCY.md](TENANCY.md).
- Further splitting of `page.tsx` and `hub-registry.service.ts`.
- Production session hardening (httpOnly cookies or managed sessions).
- Audit logging for admin and publish actions.

If you have questions, start with `AGENTS.md` and `docs/architecture.md`.
