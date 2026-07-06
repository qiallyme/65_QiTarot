# Development Notes

## Local flow

Terminal 1 — shared API Worker:

```bash
cd path/to/shared-api-worker
npm install
npm run dev
```

Terminal 2 — Tarot frontend:

```bash
cd apps/tarot-tracker-web
npm install
npm run dev
```

Open:

```txt
http://localhost:5173
```

## Frontend env

`apps/tarot-tracker-web/.env.local`:

```bash
VITE_QI_API_BASE_URL=http://localhost:8787
VITE_TAROT_APP_SLUG=tarot-tracker
```

## Worker env

Shared Worker `.dev.vars`:

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
CORS_ORIGIN=http://localhost:5173
```

## Test order

1. `GET /v1/apps/tarot/health`
2. `GET /v1/apps/tarot/spreads`
3. Create reading without photo.
4. List readings.
5. Upload photo.
6. Trigger OCR job.
7. Trigger interpretation job.

## Known scaffold gaps

- Auth/tenant resolution is placeholder-level.
- OCR is queued, not executed.
- Interpretation is queued, not executed.
- Signed photo URLs are not implemented yet.
- Correlation endpoint currently focuses on repeated card names; deeper symbolic/theme correlation is future work.

That is the correct order. Build the database spine before getting fancy.
