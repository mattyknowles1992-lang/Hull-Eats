# Contributing to Hull Eats

Thank you for reviewing or contributing to the platform.

## Prerequisites

- Node.js 22+
- `pnpm` via Corepack (`corepack enable`)
- Docker (optional, for local Postgres/Redis)

## Setup

```powershell
cp .env.example .env
pnpm install
pnpm docker:up
pnpm db:generate
pnpm db:migrate
```

## Quality checks (run before opening a PR)

```powershell
pnpm typecheck
pnpm test
```

Per-app checks when you touch a surface:

```powershell
corepack pnpm --filter @hull-eats/merchant-portal typecheck
corepack pnpm --filter @hull-eats/api typecheck
```

## Architecture

- **Apps** are deployable products (customer web, merchant portal, API, etc.).
- **Packages** hold shared types, auth helpers, and UI primitives.
- **Postgres (Supabase)** is the source of truth; the **API** is the write boundary.

See [docs/REVIEWER_GUIDE.md](docs/REVIEWER_GUIDE.md) for how we structure the merchant hub and known tradeoffs.

## Commits

Use clear, sentence-style commit messages focused on *why* the change exists.
