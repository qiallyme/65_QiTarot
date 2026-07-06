# QiTarot

QiTarot is a QiLabs tarot reading tracker with a React/Vite frontend, a Cloudflare Worker API, and Supabase persistence.

```txt
Browser at tarot.qially.com
  -> qitarot-api at api.tarot.qially.com
  -> Supabase REST and Storage
```

The browser never talks directly to Supabase. Supabase service credentials belong only in `apps/qitarot-api`.

## Repo Layout

```txt
apps/qitarot-web/          React + Vite + Cloudflare Pages frontend
apps/qitarot-api/          Cloudflare Worker API
supabase/migrations/       QiTarot schema and seed data
docs/                      API, data model, development, and deployment notes
AGENTS.md                  Agent instructions for this repo
.env.example               Frontend environment example
```

## Local Setup

```bash
npm install
```

Create `apps/qitarot-web/.env` or `.env.local`:

```bash
VITE_QITAROT_API_BASE_URL=http://localhost:8787
VITE_QITAROT_APP_SLUG=qitarot
```

Create `apps/qitarot-api/.dev.vars` from `apps/qitarot-api/.dev.vars.example` and fill Supabase secrets.

Run the API and frontend in separate terminals:

```bash
npm run dev:api
npm run dev:web
```

## API Routes

All app routes live under:

```txt
/v1/qitarot
```

Core MVP checks:

```bash
curl.exe -s http://localhost:8787/v1/qitarot/health
curl.exe -s http://localhost:8787/v1/qitarot/spreads
```

## Supabase

Apply:

```txt
supabase/migrations/001_qitarot.sql
```

The migration creates `qitarot_` tables, seeds starter spreads, enables RLS, grants the Worker `service_role` access for the Supabase Data API, and creates the `qitarot-reading-photos` storage bucket.

## Checks

```bash
npm run typecheck:web
npm run typecheck:api
npm run build:web
npm run build:api
```
