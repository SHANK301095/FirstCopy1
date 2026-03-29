# MMC - Money Making Machine

[![CI/CD](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/actions/workflows/ci.yml)

Advanced trading intelligence and backtesting platform built with React, TypeScript, and Supabase.

## Tech Stack

- **Frontend**: Vite + React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **Desktop**: Electron (optional)
- **Package Manager**: Bun (required)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- Node.js 18+ (for compatibility)

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies (Bun only)
bun install

# Start development server
bun run dev
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run preview` | Preview production build |
| `bun run lint` | Run ESLint |
| `bun run typecheck` | Run TypeScript type checking |

## Environment Setup

This project requires environment variables for Supabase integration. These are automatically configured when using Lovable.

### For Local Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in the required values:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon/public key
   - `VITE_SUPABASE_PROJECT_ID` - Your Supabase project ID

### For Production/Hosting

Set the environment variables in your hosting platform:
- **Lovable**: Automatically configured
- **Vercel/Netlify**: Add to Environment Variables in project settings
- **GitHub Actions**: Add to repository secrets

### Backend (FastAPI) Environment

If running the Python backend locally:
```bash
cd backend
pip install -r requirements.txt
python main.py
```

Required backend env vars (set in hosting/secrets):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` (service role key for backend operations)

## Project Structure

```
├── src/
│   ├── components/    # React components
│   ├── pages/         # Route pages
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utilities and services
│   ├── contexts/      # React contexts
│   └── integrations/  # Third-party integrations
├── supabase/
│   ├── functions/     # Edge Functions
│   └── config.toml    # Supabase configuration
├── backend/           # FastAPI backend (optional)
└── electron/          # Electron desktop app (optional)
```

## Features

### Core
- Dataset management with quality analysis
- Strategy library with versioning
- Professional backtesting engine
- Trade explorer with filters

### Analytics
- Monte Carlo simulation
- Walk-forward analysis
- Regime detection
- Tearsheet reports

### Trading
- Portfolio builder
- Risk dashboard
- Position sizing
- Paper trading (simulation)

## Deployment

### Via Lovable
Open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click Share → Publish.

### Custom Domain
Navigate to Project → Settings → Domains in Lovable to connect a custom domain.

## Security Notes

- Never commit `.env` files with real credentials
- Use `.env.example` as a template only
- API keys and secrets should be set in your hosting platform's environment variables
- Edge Functions access secrets via `Deno.env.get()`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `bun run lint` and `bun run build`
5. Submit a pull request

## License

Proprietary - All rights reserved.
