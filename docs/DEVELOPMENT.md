# QiTarot Development

## Local Flow

Terminal 1:

```bash
npm run dev:api
```

Terminal 2:

```bash
npm run dev:web
```

Open:

```txt
http://localhost:5173
```

## Frontend Env

`apps/qitarot-web/.env` or `.env.local`:

```bash
VITE_QITAROT_API_BASE_URL=http://localhost:8787
VITE_QITAROT_APP_SLUG=qitarot
```

Production Pages env:

```bash
VITE_QITAROT_API_BASE_URL=https://api.tarot.qially.com
VITE_QITAROT_APP_SLUG=qitarot
```

## Worker Env

`apps/qitarot-api/.dev.vars`:

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
CORS_ORIGIN=http://localhost:5173
QITAROT_APP_SLUG=qitarot
OPENAI_API_KEY=
```

Production Worker secrets:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

Production Worker vars:

```bash
CORS_ORIGIN=https://tarot.qially.com
QITAROT_APP_SLUG=qitarot
```

## Checks

```bash
npm install
npm run typecheck:web
npm run typecheck:api
npm run build:web
npm run build:api
```

## Test Order

1. `GET /v1/qitarot/health`
2. `GET /v1/qitarot/spreads`
3. Create reading without photo.
4. List readings.
5. Upload photo.
6. Trigger OCR job.
7. Trigger interpretation job.

## Known MVP Gaps

- Auth/tenant resolution is placeholder-level.
- OCR is queued, not executed.
- Interpretation is queued, not executed.
- Signed photo URLs are not implemented yet.
- Correlation endpoint currently focuses on repeated card names.
