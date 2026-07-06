# Agent Instructions - QiTarot

## Goal

Keep `C:\QiLabs\60_QiApps\65_QiTarot` aligned to the final QiTarot app architecture without overbuilding past the MVP.

## Canonical Names

- App folder/root: `65_QiTarot`
- Display name: `QiTarot`
- App slug: `qitarot`
- Frontend app folder: `apps/qitarot-web`
- Worker/API folder: `apps/qitarot-api`
- Cloudflare Pages project: `qitarot-web`
- Cloudflare Worker project: `qitarot-api`
- Frontend public domain: `tarot.qially.com`
- API domain: `api.tarot.qially.com`
- API route prefix: `/v1/qitarot`
- Supabase table prefix: `qitarot_`
- Supabase storage bucket: `qitarot-reading-photos`

## Architecture Rules

- The frontend talks only to `qitarot-api` through `VITE_QITAROT_API_BASE_URL`.
- `qitarot-api` talks to Supabase with server-side credentials.
- Do not put Supabase service keys in the frontend.
- Keep QiTarot isolated in this repo.
- Do not use or modify `C:\QiLabs\25_QiWorkers` for this app unless explicitly requested.
- Keep all app routes under `/v1/qitarot/*`.
- Keep migration tables prefixed `qitarot_`.

## Required Env Names

Frontend:

```bash
VITE_QITAROT_API_BASE_URL=http://localhost:8787
VITE_QITAROT_APP_SLUG=qitarot
```

Worker:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CORS_ORIGIN=http://localhost:5173
QITAROT_APP_SLUG=qitarot
OPENAI_API_KEY=
```

## Definition of Done for MVP

- A reading persists in Supabase.
- Its cards persist in order.
- Its photo saves through Worker/Supabase Storage or returns a clean storage error.
- Timeline loads from API.
- Interpretation text can be saved and retrieved.
- Tags/subject are searchable enough for carryover review.

## Do Not Overbuild

Avoid deck marketplaces, payment systems, social sharing, complex astrology modules, or a fleet of AI agents. Finish the CRUD, storage, and interpretation pipe first.
