# SeasonVille Runbook

## Local Setup
1. `npm install`
2. `npm run prisma:seed`
3. `npm run dev`

## Demo Accounts
- admin@seasonville.test (ADMIN) - password placeholder
- user@seasonville.test (USER) - password placeholder

## Needs Setup Integrations
- Payments: Razorpay/Stripe adapter stub
- Courier: Shiprocket/Delhivery adapter stub
- WhatsApp: WATI/Twilio stub
- Email: SES/Resend stub

## Core Routes
- `/` Home
- `/festivals/[slug]` Festival landing
- `/collections` All products
- `/products/[slug]` Product detail
- `/cart` Cart
- `/checkout` Checkout
- `/account` Account
- `/admin` Admin console
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
