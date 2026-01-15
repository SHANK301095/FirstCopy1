# SeasonVille Runbook

## Local Setup (one command)

```bash
npm install && npm run prisma:generate
```

> Configure `.env` using `.env.example` before running migrations.

## Day-to-day
- `npm run dev` — start Next.js locally.
- `npm run prisma:migrate` — run migrations locally.
- `npm run prisma:seed` — seed demo data including backlog 520.
- `npm run test` — Playwright smoke tests.

## Demo accounts
- Admin: `admin@seasonville.test`
- Shopper: `demo@seasonville.test`

## Needs Setup adapters
Payments, courier, WhatsApp, and email integrations are stubs until env vars exist.
