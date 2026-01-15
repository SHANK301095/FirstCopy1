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
