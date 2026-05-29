# Hull Eats platform roadmap

This is the **living roadmap** from MVP toward enterprise-grade software. It explains **what to build in what order**, what is **already done**, and what **future agents must not skip**.

Read this after [AGENTS.md](../AGENTS.md). Progress details live in [ARCHITECTURE-PROGRESS.md](ARCHITECTURE-PROGRESS.md).

## Principles (do not violate)

1. **Postgres + API are the source of truth** — portals never own business-critical state alone.
2. **One hub user → one business** — tenancy checks on every merchant route ([TENANCY.md](TENANCY.md)).
3. **Contracts first** — change `packages/types`, then API, then apps.
4. **No new god files** — do not add business logic to `page.tsx` or grow `hub-registry.service.ts` without splitting.
5. **Features behind entitlements** — new product pillars use `business_package_entitlements`, not env-only toggles.

## Layer model (build bottom-up)

```text
┌─────────────────────────────────────────┐
│  Deployable apps (customer, merchant,   │
│  admin, courier)                        │
├─────────────────────────────────────────┤
│  packages/sdk + portal API wrappers     │
├─────────────────────────────────────────┤
│  apps/api domain modules                │
│  (auth, hub workspace, menu, orders)    │
├─────────────────────────────────────────┤
│  packages/types + packages/auth         │
├─────────────────────────────────────────┤
│  Postgres (Prisma) + audit + packages   │
└─────────────────────────────────────────┘
```

---

## Phase 1 — Foundation freeze

**Goal:** Stop structural decay while shipping product features.

| Item | Status | Notes |
|------|--------|-------|
| Unit tests (auth, locale, errors, workspace, menu normalize) | ✅ Done | `pnpm test` |
| CI (typecheck + tests) | ✅ Done | `.github/workflows/ci.yml` |
| Merchant portal split (`merchant-api`, session, workspace state) | ✅ Done | `page.tsx` still holds UI shell |
| Hub tenancy helper + tests | ✅ Done | `packages/auth/src/hub-tenancy.ts` |
| Workspace PATCH tests (settings-only) | ✅ Done | `packages/types/src/hubs.workspace.test.ts` |
| SDK HTTP layer (`apiJson`, `ApiRequestError`) | ✅ Done | `packages/sdk/src/http.ts` |
| Merchant portal uses SDK via `merchant-request.ts` | ✅ Done | Friendly errors preserved |
| Reviewer + tenancy docs | ✅ Done | `REVIEWER_GUIDE.md`, `TENANCY.md`, `CONTRIBUTING.md` |
| **Rule:** no new logic in `page.tsx` | 🔄 Ongoing | Extract to `hub-*` modules |
| Extract orders/settings UI shells from `page.tsx` | ⬜ Next | Target &lt;2,000 lines in `page.tsx` |
| Tenancy integration test (API 401 cross-hub) | ⬜ Next | Depends on test DB or mocked Nest |

**Exit gate:** CI green; `page.tsx` line count not increasing; cross-hub access tested.

---

## Phase 2 — Domain model cleanup

**Goal:** Integrations and Menu Studio features attach to stable data, not string markers.

| Item | Status | Notes |
|------|--------|-------|
| Platform audit log table + service | ✅ Done | Migration `20260528160000_*`; `AuditLogService` |
| Audit: merchant login, workspace save, admin hub create | ✅ Done | More actions in Phase 3 |
| Business package entitlements schema | ✅ Done | Default full stack when no rows |
| GET `/v1/merchant/hubs/:hubId/entitlements` | ✅ Done | `BusinessPackageService` |
| Gate UI/API by entitlements | ⬜ Planned | After admin assign UI |
| Migrate `__HULL_*` menu markers → JSON/DB | ⬜ Planned | One category type at a time (pizza columns first) |
| Split `hub-registry.service.ts` by domain | ⬜ Planned | `HubMenuService`, `HubWorkspaceService`, … |
| Admin + customer portals on `@hull-eats/sdk` | ⬜ Planned | Merchant done via `merchant-request` |

**Exit gate:** New menu capability = DB/types/API/test, not a new description prefix.

---

## Phase 3 — Production identity & operations

**Goal:** Safe at scale; answer “who changed what?”

| Item | Status |
|------|--------|
| httpOnly / refresh hub sessions | ⬜ Planned |
| Rate limiting on login | ⬜ Planned |
| Persistent admin accounts (not env bootstrap) | ⬜ Planned |
| Audit: publish, user create/delete, order accept/reject | ⬜ Planned |
| Structured logging + error tracking | ⬜ Planned |
| E2E smoke (login → publish → customer menu) | ⬜ Planned |

---

## Phase 4 — Enterprise product surface

**Goal:** Sell modular pillars without rewriting core.

| Item | Status |
|------|--------|
| Admin UI for package entitlements | ⬜ Planned |
| Integrations boundary (Just Eat, etc.) | ⬜ Planned |
| AI phone on same order/menu APIs | ⬜ Planned |
| Customer GDPR export/erase tooling | ⬜ Planned |
| Optional dedicated deploy per enterprise contract | ⬜ As needed |

---

## For future agents

### Before you code

1. Read [AGENTS.md](../AGENTS.md) and this file.
2. Check [ARCHITECTURE-PROGRESS.md](ARCHITECTURE-PROGRESS.md) for recent structural changes.
3. Run `pnpm typecheck` and `pnpm test`.

### Where to put new work

| Change type | Location |
|-------------|----------|
| Shared DTO / validation | `packages/types` |
| Password / tenancy helpers | `packages/auth` |
| HTTP to API | `packages/sdk` → portal thin wrapper |
| Merchant API calls | `apps/merchant-portal/app/merchant-api.ts` |
| Hub business logic | `apps/api/src/common/*` (prefer new service file) |
| Menu draft rules | `apps/merchant-portal/app/menu-studio-core.ts` |
| Audit events | `AuditLogService.record()` |

### Do not

- Add fetch calls in `page.tsx` — use `merchant-api.ts`.
- Add merchant routes without `requireMerchantToken(authorization, hubId)`.
- Add product pillars as UI-only env flags — use entitlements.
- Add another 500 lines to `hub-registry.service.ts` without extracting a service.

### Deploy notes

- Run `pnpm db:deploy` after pulling migrations (audit + entitlements).
- Deploy **api + merchant-portal + customer-web** together for menu/workspace changes.

---

## Related docs

- [ARCHITECTURE-PROGRESS.md](ARCHITECTURE-PROGRESS.md) — changelog of structural work
- [REVIEWER_GUIDE.md](REVIEWER_GUIDE.md) — for investors/engineers reviewing the repo
- [TENANCY.md](TENANCY.md) — hub isolation and GDPR-oriented notes
- [architecture.md](architecture.md) — original system design
- [CONTRIBUTING.md](../CONTRIBUTING.md) — setup and quality commands
