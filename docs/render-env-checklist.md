# Render environment checklist

Use this to align **Render dashboard** env vars with `Hull_Eats/.env`. Values are set in the Render UI (`sync: false` in `render.yaml` means you type them in).

## hull-eats-api (required)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Supabase **pooler** URI (port **6543**, `?pgbouncer=true`) — API runtime |
| `DATABASE_URL_DIRECT` | Port **5432** session URI (Supabase direct `db.[ref].supabase.co`, or pooler host on `:5432` without `pgbouncer`) — migrations only; optional on API until you add a release command |
| `INTERNAL_AUTH_TOKEN_SECRET` | Min 32 characters; must match if you test merchant tokens locally |
| `ADMIN_BOOTSTRAP_EMAIL` | Admin portal login |
| `ADMIN_BOOTSTRAP_PASSWORD` | Admin portal password (min 12 chars) |
| `SUPABASE_URL` | `https://[project-ref].supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase → Settings → API |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | When payments are live |
| `NEXT_PUBLIC_API_URL` | Public API URL, e.g. `https://hull-eats-api.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | Usually `wss://hull-eats-api.onrender.com` |

`REDIS_HOST` / `REDIS_PORT` come from the Redis service in `render.yaml`.

## hull-eats-worker

Same as API for: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, Stripe keys if used.

## hull-eats-customer-web

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `https://hull-eats-api.onrender.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[ref].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

## hull-eats-merchant-portal / hull-eats-admin-portal

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `https://hull-eats-api.onrender.com` |

## After env is set

1. Locally: `corepack pnpm db:deploy` then `corepack pnpm db:check` (all green).
2. On Render: redeploy `hull-eats-api`, `hull-eats-merchant-portal`, `hull-eats-customer-web` after `main` is up to date.

Optional later: **Release Command** on `hull-eats-api`: `npx --yes pnpm@10.11.0 db:deploy` (only after `DATABASE_URL_DIRECT` is set on Render).
