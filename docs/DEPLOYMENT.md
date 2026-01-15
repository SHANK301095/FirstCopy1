# Deployment

## Vercel
1. Add `DATABASE_URL` for Postgres (Neon/Supabase/Render).
2. Add `NEXTAUTH_SECRET` or session secret if you wire auth provider.
3. Deploy via Vercel Git integration.

## Environment placeholders
See `.env.example` for required placeholders. Payment/courier/WhatsApp/email adapters remain in “Needs Setup” status until configured.
