# Hub tenancy and data isolation

This document explains how Hull Eats keeps **one business hub’s data separate from another**. It is written for operators, reviewers, and GDPR discussions.

## Short answer

**Merchants do not share one portal “section” that mixes businesses.** Each hub user belongs to **one business** (`HubUser.merchantId`). The API checks that on every merchant request. A Pizza Place login cannot load or save Kebab Shop’s workspace, orders, or users through normal API use.

Hull Eats **admin** staff can access all hubs — that is intentional platform operations, not merchant-to-merchant access.

## How isolation works

### 1. One login → one business

- Each `HubUser` row is tied to a single `merchantId` (business/hub id).
- Login returns a signed bearer token bound to that user id.
- On each request, `InternalAuthService.requireMerchantToken`:
  - Verifies the token signature and expiry
  - Loads the user from Postgres (active, not disabled)
  - Compares `sessionVersion` (invalidates old sessions after password reset)
  - If the route includes `:hubId`, checks **`user.merchantId === hubId`** — otherwise returns *401*

Relevant code: `apps/api/src/common/internal-auth.service.ts`

### 2. Hub-scoped API routes

Merchant routes under `/v1/merchant/hubs/:hubId/...` (workspace, menu, users, settings, drivers, etc.) always pass `hubId` into `requireMerchantToken`.

Order routes without `hubId` in the URL (`/v1/merchant/orders`, accept/reject, print) use the **hub id from the authenticated user record**, not from the client body.

Database reads filter by hub, e.g. orders:

```text
store.merchantId = hubId
```

Relevant code: `apps/api/src/modules/merchant/merchant.controller.ts`, `apps/api/src/common/order-repository.ts`

### 3. Merchant portal (browser)

- Session is stored in `localStorage` under a fixed key, but contains **one hub id + token** at a time.
- Menu draft backups are keyed **`hull-eats-menu-draft-{hubId}`** — drafts for different hubs do not overwrite each other on the same device.
- Logging into hub B replaces the active session; the UI only loads data for the logged-in hub.

The portal is **multi-tenant SaaS** (one deployed app, many businesses). That is standard and acceptable when the **API enforces tenancy** as above. Separate deployments per takeaway are not required for isolation.

### 4. Customer-facing apps

- Public store pages are scoped by **store slug**; only active menu items for that store are exposed.
- Customer accounts (Supabase) are separate from hub logins.
- Checkout orders are tied to a store; merchants only see orders for their `merchantId`.

### 5. Admin portal

- Hull Eats internal admins authenticate with a different token scope (`admin`).
- They can list and manage all hubs — required for support and provisioning.
- This is **not** merchant users seeing each other’s data.

## GDPR-relevant notes (not legal advice)

| Topic | Current model |
|-------|----------------|
| **Data controller/processor roles** | Product/legal should define per contract; technically each hub’s operational data is keyed by business id. |
| **Merchant seeing another merchant’s PII** | Not via merchant API under normal auth; prevented by hub checks + query filters. |
| **Customer PII on orders** | Visible to the merchant fulfilling that order (name, address, phone) — expected for delivery. |
| **Right to erasure / export** | Hub deletion and customer account flows exist at platform level; formal GDPR tooling is still maturing (see `AGENTS.md` known gaps). |
| **Audit trail** | Permission denials and admin actions are not fully audit-logged yet — recommended before scale. |

## Known gaps (hardening, not active cross-leak bugs)

These improve **assurance and compliance posture**; they are not evidence that merchants currently see each other’s hubs:

1. **Automated tenancy tests** — integration tests that prove hub A’s token cannot read hub B’s workspace/orders (recommended next step).
2. **Audit logging** — who accessed which hub, publish events, admin views.
3. **Production admin accounts** — move off bootstrap env credentials; role-based internal access.
4. **Rate limiting / lockout** — reduce credential stuffing on merchant login.
5. **Session storage** — optional move from `localStorage` to httpOnly cookies to reduce XSS token theft (theft would still only expose **one** hub’s session).

## Do we need a separate portal per business?

**No**, for data isolation. One merchant portal deployment with strict API tenancy is industry normal (Stripe Dashboard, Shopify admin, etc.).

Separate deployments only matter if a **contract** requires physical/logical separation (dedicated DB, VPC, or white-label instance). The codebase already supports modular rollout of apps; that is a **commercial/hosting** choice, not a fix for a current cross-hub bug.

## Quick verification checklist

When reviewing or before go-live:

- [ ] Merchant token for hub A → `GET /v1/merchant/hubs/{hubB}/workspace` returns **401**
- [ ] Merchant token for hub A → `GET /v1/merchant/orders` returns **only** hub A orders
- [ ] Hub user deleted/disabled → existing token rejected
- [ ] Admin routes require admin token, not merchant token

See also [REVIEWER_GUIDE.md](REVIEWER_GUIDE.md) and [AGENTS.md](../AGENTS.md).
