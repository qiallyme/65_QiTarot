# Tarot Tracker — Supabase/Worker Scaffold

This is **not a mockup**. It is a repo-ready scaffold for the Tarot Tracker app using the QiLabs pattern:

```txt
Browser / Cloudflare Pages frontend
        ↓
Shared Cloudflare API Worker
        ↓
Supabase REST / Storage / optional AI services
```

The browser never talks directly to Supabase. The shared Worker owns Supabase credentials, auth resolution, tenant resolution, storage writes, OCR/AI jobs, and persistence.

## What is included

```txt
apps/tarot-tracker-web/        React + Vite + Cloudflare Pages frontend
api-worker-patch/              Drop-in route module for the existing shared API Worker
supabase/migrations/           Tarot Tracker schema + spread seed data
docs/                          API contract, data model, IDE/Codex handoff, deployment notes
AGENTS.md                      Instructions for IDE agents/Codex
.env.example                   Local frontend environment example
```

## MVP behavior

The app supports the durable flow:

1. Pick a spread template.
2. See a diagram and ordered card positions.
3. Create a reading entry.
4. Upload/save a photo through the Worker.
5. Confirm card names and orientations.
6. Save interpretation/tags/subject.
7. View timeline and card/tag carryover.
8. Call OCR/AI endpoints when those Worker features are implemented.

## Install frontend

```bash
cd apps/tarot-tracker-web
npm install
npm run dev
```

Create `apps/tarot-tracker-web/.env.local`:

```bash
VITE_QI_API_BASE_URL=http://localhost:8787
VITE_TAROT_APP_SLUG=tarot-tracker
```

## Deploy frontend with Cloudflare Pages

From `apps/tarot-tracker-web`:

```bash
npm run build
npx wrangler pages deploy dist --project-name tarot-tracker-web
```

The included `wrangler.toml` is a template. If this is mounted under an existing Pages project, copy only the relevant vars.

## Wire Worker routes

Copy this folder into the existing shared API Worker:

```txt
api-worker-patch/src/apps/tarot/
```

Then mount `handleTarotRoute()` inside the existing Worker router. See:

```txt
api-worker-patch/README_MERGE.md
```

## Apply Supabase migration

Run the SQL in:

```txt
supabase/migrations/001_tarot_tracker.sql
```

This creates app-specific tables prefixed with `tarot_` and seeds starter spreads.

## Hard rule

Do not let the frontend write directly to Supabase. That defeats the architecture and creates security/RLS trash fire later.
