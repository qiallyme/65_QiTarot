# Agent Instructions — Tarot Tracker

## Goal

Turn this scaffold into a working QiLabs app without breaking the shared API Worker architecture.

## Architecture rules

- Frontend talks to the API Worker only.
- API Worker talks to Supabase with server-side credentials.
- Do not put Supabase service keys in the frontend.
- Do not create a second dedicated API Worker unless explicitly requested.
- Prefer adding route modules to the existing shared Worker.
- Keep all app routes under `/v1/apps/tarot/*`.
- Keep migration tables prefixed `tarot_` unless the owner explicitly asks to fold them into a broader QiLife schema.

## First implementation pass

1. Run the Supabase migration.
2. Merge `api-worker-patch/src/apps/tarot` into the existing Worker.
3. Mount `handleTarotRoute()` in the Worker’s main router before generic 404 handling.
4. Set Worker secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - optional `CORS_ORIGIN`
5. Run Worker locally with Wrangler.
6. Run frontend locally.
7. Confirm these endpoints:
   - `GET /v1/apps/tarot/health`
   - `GET /v1/apps/tarot/spreads`
   - `POST /v1/apps/tarot/readings`
   - `GET /v1/apps/tarot/readings`

## Do not overbuild

Avoid building deck marketplaces, payment systems, social sharing, complex astrology modules, or ten different AI agents. Finish the boring CRUD + storage + interpretation pipe first.

## Definition of done for MVP

- A reading persists in Supabase.
- Its cards persist in order.
- Its photo saves through Worker/Supabase Storage or returns a clean “storage not configured” response.
- Timeline loads from API.
- Interpretation text can be saved and retrieved.
- Tags/subject are searchable enough for carryover review.
