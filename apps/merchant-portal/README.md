# Merchant portal

Business hub software for restaurants and takeaways: menu studio, delivery settings, orders, and team users.

## Local dev

```powershell
corepack pnpm --filter @hull-eats/merchant-portal dev
```

Set `NEXT_PUBLIC_API_URL` to your API (default local: `http://localhost:4000`).

## Code layout

- `app/page.tsx` — main hub shell (navigation and sections)
- `app/merchant-api.ts` — API client functions
- `app/merchant-session.ts` — login session in the browser
- `app/merchant-workspace-state.ts` — settings/menu snapshot helpers
- `app/menu-studio-core.ts` — menu draft and publish logic
- `app/hub-menu-*.tsx` — Menu Studio UI components

See [docs/REVIEWER_GUIDE.md](../../docs/REVIEWER_GUIDE.md) for architecture context.
