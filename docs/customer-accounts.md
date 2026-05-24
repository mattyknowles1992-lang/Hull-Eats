# Hull Eats customer accounts (food ordering)

One account type for people who order food on Hull Eats. This is separate from **hub users** (business portal), **admin** (internal), and **couriers** (per-hub drivers).

## How it works today

| Layer | Role |
| --- | --- |
| **Supabase Auth** | Email + password, sessions on web (and future mobile app) |
| **`customer_profiles`** | Name, phone, status, Stripe customer id, marketing flags |
| **`customer_addresses`** | Saved delivery addresses |
| **`orders`** | Linked by `customer_profile_id` (and legacy guest orders by email) |
| **Customer web** | `apps/customer-web` — sign in, register, account page, checkout |
| **Admin portal** | Lists and moderates customers via API (`/v1/admin/customers`) |

Shared account logic for the website lives in `apps/customer-web/src/lib/customer-account.ts` so the Expo app can reuse the same helpers with the same Supabase project.

## Supabase project settings (required for launch UX)

In **Authentication → Providers → Email**:

1. **Confirm email** — turn **off** if you want instant sign-in after register (no verification step).
2. **Secure email change** — optional; keep on for production if you add email change later.

In **Authentication → URL configuration**, add redirect URLs:

- `https://<your-customer-web>/account/update-password`
- `http://localhost:3000/account/update-password` (local)

Password reset emails use `resetPasswordForEmail` with that redirect.

## What customers can do now (customer web)

- Register with name, phone, email, password, address (8+ char password)
- Sign in on any device; session syncs via Supabase (`onAuthStateChange`)
- Forgot password → email link → `/account/update-password`
- Change password while signed in
- Edit name and phone
- View current and previous orders (with track link)
- Add addresses and set default
- Sign out

## What you can see as Hull Eats admin

Admin console loads real customers from Postgres via the API (`CustomerRegistryService`). You can filter, suspend, flag for review, and add notes — not demo data.

## Not built yet (vs Just Eat / Uber Eats)

These need dedicated schema + checkout/account UI:

| Feature | Status |
| --- | --- |
| Saved payment cards | `stripe_customer_id` on profile; no account UI or Stripe PaymentMethods flow yet |
| Account-level vouchers / batch discounts | Store promos exist per takeaway; no `customer_promo_entitlements` yet |
| Loyalty points / stamps | Placeholder copy on account page only |
| Reorder one tap | Open store menu manually |
| Order detail / receipt PDF | Track page only |
| Push notifications | `customer_push_tokens` table exists; not wired in customer web |
| Mobile app parity | `customer-app` not on Supabase auth yet — reuse `customer-account.ts` when you wire it |
| Real `/v1/customer/*` API | Still demo in `customer.controller.ts`; web uses Supabase directly today |

Recommended build order after launch basics:

1. Stripe Customer + save card at checkout + manage on account page  
2. `customer_promo_entitlements` + admin assign UI + apply at checkout  
3. Loyalty ledger (points per order, redeem rules)  
4. Replace demo customer API OR keep Supabase as source of truth and use API only for admin/ops  

## Security notes

- Passwords are hashed by Supabase Auth; never stored in `customer_profiles`.
- Row Level Security on `customer_profiles` / `customer_addresses` must scope reads/writes to `auth.uid()`.
- Rate-limit auth endpoints in production (Supabase + API gateway).
- Do not return password hashes or service role keys to the browser.

## Related files

- `docs/supabase-bootstrap.sql` — `customer_profiles`, trigger `sync_customer_profile_from_auth`
- `apps/customer-web/app/account/account-client.tsx` — account UI
- `apps/customer-web/src/lib/customer-account.ts` — shared data access
- `apps/api/src/common/customer-registry.service.ts` — admin customer list/update
