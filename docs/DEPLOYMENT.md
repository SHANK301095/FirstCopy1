# Deployment

- Target: Vercel
- Database: Neon/Supabase/Render Postgres (use SQLite for local fallback)
- Env placeholders:
  - DATABASE_URL
  - AUTH_SECRET
  - RAZORPAY_KEY
  - STRIPE_KEY
  - COURIER_API_KEY
  - WHATSAPP_API_KEY
  - EMAIL_API_KEY
## Vercel
1. Add `DATABASE_URL` for Postgres (Neon/Supabase/Render).
2. Add `NEXTAUTH_SECRET` or session secret if you wire auth provider.
3. Deploy via Vercel Git integration.

## Environment placeholders
See `.env.example` for required placeholders. Payment/courier/WhatsApp/email adapters remain in “Needs Setup” status until configured.
