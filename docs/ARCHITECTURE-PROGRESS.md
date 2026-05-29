# Architecture progress log

Chronological record of **structural and quality improvements** to Hull Eats. Use this with [ROADMAP.md](ROADMAP.md) so auditors and agents see **what changed, why, and what to expect next**.

## 2026-05-28 — Enterprise roadmap implementation (Phase 1–2 start)

### Why

Investors and external programmers will review the repo. We needed:

- Proof of quality (tests, CI)
- Clear module boundaries (not one unmaintainable file)
- Tenancy and audit story for GDPR discussions
- A documented path so features are not stacked on fragile layers

### What was done

#### Testing & CI

| Change | Why |
|--------|-----|
| Vitest at repo root (`pnpm test`) | Repeatable quality signal for reviewers |
| Tests: auth passwords, hub tenancy, locale, workspace PATCH, menu normalize, merchant errors | Cover high-risk pure logic first |
| GitHub Actions: typecheck + test | CI on every push/PR |

#### Merchant portal structure

| File | Purpose |
|------|---------|
| `merchant-config.ts` | API/base URLs (single place) |
| `merchant-request.ts` | SDK HTTP + friendly error mapping |
| `merchant-api.ts` | All merchant API functions (no raw fetch) |
| `merchant-session.ts` | Browser session keys + persist/clear |
| `merchant-workspace-state.ts` | Settings normalization + snapshots |
| `hub-merchant-errors.ts` | Customer-facing error copy |

`page.tsx` reduced by moving API/session/workspace out. **UI shell remains in `page.tsx`** — next step is orders/settings section extraction (see ROADMAP Phase 1).

#### SDK

| Change | Why |
|--------|-----|
| `packages/sdk/src/http.ts` — `apiJson`, `ApiRequestError` | Single HTTP pattern; portals wrap with domain errors |
| Merchant portal wired through `merchant-request.ts` | First app on SDK path; admin/customer to follow |

#### Tenancy

| Change | Why |
|--------|-----|
| `packages/auth/src/hub-tenancy.ts` — `assertMerchantHubAccess` | Testable hub isolation rule |
| API `requireMerchantToken` uses shared helper | Same rule everywhere; documented in TENANCY.md |

#### Audit & modular packages (Phase 2 start)

| Change | Why |
|--------|-----|
| Prisma `platform_audit_logs` + migration | “Who did what” foundation for compliance |
| `AuditLogService` | Non-blocking writes (warns if migration not applied) |
| Audited: merchant login, workspace save/publish, admin hub create | First critical events |
| Prisma `business_package_entitlements` + migration | DB-backed modular rollout (marketplace-only, portal-only, etc.) |
| `BusinessPackageService` + GET entitlements API | Default full stack when no rows; ready for admin assign UI |
| `packages/types/src/business-packages.ts` | Shared package key enum |

#### Documentation

| Doc | Audience |
|-----|----------|
| `docs/ROADMAP.md` | Agents, founders, auditors — build order |
| `docs/REVIEWER_GUIDE.md` | Engineers/investors — quick repo orientation |
| `docs/TENANCY.md` | GDPR/isolation questions |
| `CONTRIBUTING.md` | Setup + `pnpm test` |
| `apps/merchant-portal/README.md` | Module map |

### What was not changed (behaviour)

- Menu Studio UX and publish flow
- Customer storefront behaviour
- Hub login credentials model (still bearer + localStorage — Phase 3)
- `__HULL_*` menu description markers (migration planned Phase 2)

### What reviewers should run

```powershell
pnpm install
pnpm db:deploy   # applies audit + entitlements migration
pnpm typecheck
pnpm test
```

### Expected next entries in this log

1. Orders/settings UI extracted from `page.tsx`
2. API tenancy integration test
3. More audit actions (user admin, order accept)
4. First `__HULL_*` → JSON column migration (pizza size columns)
5. First slice of `hub-registry.service.ts` split

---

## Template for future agents

When you complete structural work, append a dated section:

```markdown
## YYYY-MM-DD — Short title

### Why
(one paragraph)

### What was done
(bullets with file paths)

### What was not changed
(bullets)

### Follow-ups
(link to ROADMAP checkboxes)
```

Update [ROADMAP.md](ROADMAP.md) checkbox status when items complete.
