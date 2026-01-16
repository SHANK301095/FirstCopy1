# SeasonVille

Festival-first private label ecommerce platform for India.

## Runbook

**Node version:** 18.x or 20.x (LTS recommended)

### 1) Install dependencies

```bash
npm install
```

### 2) Environment setup

```bash
cp .env.example .env
```

Update `DATABASE_URL` for your Postgres instance and fill provider keys as needed. All integrations are marked as "Needs Setup" until configured.

### 3) Prisma

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 4) Start dev server

```bash
npm run dev
```

Open http://localhost:3000.

## Demo accounts
- Admin: `admin@seasonville.test`
- Shopper: `demo@seasonville.test`

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Backlog
Generate CSV:

```bash
npm run backlog:csv
```
