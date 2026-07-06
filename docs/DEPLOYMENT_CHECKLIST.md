# Deployment Checklist

## Supabase

- [ ] Run `supabase/migrations/001_tarot_tracker.sql`.
- [ ] Confirm tables exist.
- [ ] Confirm spread seed rows exist.
- [ ] Confirm storage bucket `tarot-reading-photos` exists.
- [ ] Confirm frontend cannot write directly to protected tables.

## API Worker

- [ ] Copy `api-worker-patch/src/apps/tarot` into shared Worker.
- [ ] Mount `/v1/apps/tarot/*` routes.
- [ ] Set `SUPABASE_URL`.
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Set `CORS_ORIGIN` to the Pages origin.
- [ ] Deploy Worker with Wrangler.
- [ ] Hit `/v1/apps/tarot/health` in production.

## Frontend

- [ ] Set `VITE_QI_API_BASE_URL` to production Worker URL.
- [ ] Build frontend.
- [ ] Deploy Cloudflare Pages.
- [ ] Create a test reading.
- [ ] Upload a test image.
- [ ] Confirm reading appears in timeline after refresh.

## Production sanity

- [ ] No Supabase service keys in frontend build.
- [ ] No direct browser calls to Supabase REST.
- [ ] CORS does not use `*` in production.
- [ ] Failed OCR/AI jobs return clean status, not broken UI.
