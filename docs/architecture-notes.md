# Architecture Notes

## Directory map
- `app/`: Next.js App Router pages and API routes.
- `components/`: shared UI primitives and layout components.
- `lib/`: catalog data, constants, and helper utilities.
- `prisma/`: schema and seed data for local development.
- `legacy/`: parked Flask scaffold (non-running).
- `docs/`: project documentation.

## Main pages
- `/` Home with seasonal highlights and trust badges.
- `/collections` Product discovery.
- `/festivals/[slug]` Festival-specific landing page.
- `/products/[slug]` Product detail view.
- `/cart` and `/checkout` for order flow.
- `/admin/*` placeholders for ops tooling.

## Data flow
- UI currently renders from `lib/catalog.ts` and seeded data in Prisma.
- API routes are placeholders in `app/api/*` and return "Needs Setup" responses.
- Prisma models cover core commerce entities; real integrations can replace mock data.

## Plugging in auth/payments later
- Auth: replace `app/api/auth/route.ts` with real auth provider, store session in DB.
- Payments: wire provider keys in `.env` and implement checkout flow in `app/api/checkout/route.ts`.
- Shipping: implement provider in `app/api/needs-setup/route.ts` and update checkout UI.
