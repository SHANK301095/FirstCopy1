# MMC Staging Environment Guide

## Overview

This guide explains how to set up and use the staging environment for MMC.

---

## Environment Configuration

### Automatic Configuration (Lovable Cloud)

When using Lovable Cloud, the following are automatically configured:
- `VITE_SUPABASE_URL` - Database connection
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Public API key
- `VITE_SUPABASE_PROJECT_ID` - Project identifier

### Environment Detection

The app automatically detects its environment:
- **Production:** Published Lovable URL
- **Staging:** Preview URLs (`*-preview--*.lovable.app`)
- **Development:** `localhost`

---

## Safe Defaults

### Authentication
- Email confirmation: Auto-confirm enabled for development
- Session duration: 7 days
- Password requirements: 6+ characters

### Database
- RLS: Enabled on all tables
- Workspace isolation: Enforced via RLS policies

### Rate Limits
- API calls: Managed by Lovable Cloud
- File uploads: 50MB max per file

---

## Demo/Seed Data

### For Testing Purposes

The app works with empty data. To seed demo data:

1. **Via UI:**
   - Login with test account
   - Use "Quick Import" to upload sample CSV
   - Create test strategies manually

2. **Sample CSV Format:**
```csv
Date,Time,Open,High,Low,Close,Volume
2024-01-01,09:30:00,100.00,101.50,99.50,101.00,10000
2024-01-01,09:31:00,101.00,102.00,100.50,101.75,8500
```

### Test Account Setup

For staging, create a test user:
1. Go to `/signup`
2. Use email: `test@example.com` (or any valid email)
3. Password: `testing123`

---

## Workspace Isolation

### How It Works

Each user's data is isolated via Row Level Security (RLS):

```sql
-- Example policy (automatically applied)
CREATE POLICY "Users can only access own data"
ON datasets
USING (user_id = auth.uid());
```

### Verification

To verify isolation:
1. Create two test accounts
2. Import data with Account A
3. Login as Account B
4. Confirm Account B cannot see Account A's data

### Automated Test

The E2E tests include a security check:
```typescript
test("protected routes redirect to login", async ({ page }) => {
  // Verifies unauthenticated users can't access data
});
```

---

## Staging vs Production

| Feature | Staging | Production |
|---------|---------|------------|
| URL | `*-preview--*.lovable.app` | `mmc3010.lovable.app` |
| Database | Same (shared) | Same (shared) |
| Auth | Auto-confirm emails | Auto-confirm emails |
| Error tracking | Console only | Console only* |
| Rate limits | Standard | Standard |

*Configure Sentry for production error tracking

---

## Deploying to Staging

### Automatic (Recommended)
1. Push to `main` branch
2. CI runs all checks
3. Lovable syncs automatically
4. Preview URL updates

### Manual
1. Open Lovable editor
2. Make changes
3. Changes auto-save
4. Click "Publish" for production

---

## Debugging in Staging

### Console Logs
- Open browser DevTools → Console
- Filter by `[MMC]` for app-specific logs

### Network Requests
- DevTools → Network tab
- Filter by `supabase` for database calls

### Health Check
```bash
curl https://[preview-url]/functions/v1/health
```

---

## Troubleshooting

### Common Issues

**"Database connection failed"**
- Check Lovable Cloud status
- Verify environment variables

**"Auth not working"**
- Clear browser cookies
- Check for console errors

**"Data not loading"**
- Check RLS policies
- Verify user is logged in
- Check network tab for errors

### Getting Help
1. Check `docs/LAUNCH_READINESS.md`
2. Review CI logs in GitHub Actions
3. Use Lovable support chat
