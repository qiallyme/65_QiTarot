# IDE / Codex Handoff

## Build target

Make Tarot Tracker production-ready as a QiLabs app that uses the shared Cloudflare API Worker for all Supabase access.

## Current scaffold state

- Frontend exists and compiles as a Vite React app.
- API client points to `/v1/apps/tarot` on the Worker.
- Worker route module is provided as a patch, not a standalone backend.
- Supabase schema/migration is included.
- OCR and interpretation are queued but not implemented.

## Agent tasks, in order

### 1. Merge Worker patch

Copy `api-worker-patch/src/apps/tarot` into the existing Worker source.

Mount route:

```ts
if (url.pathname.startsWith('/v1/apps/tarot')) {
  return handleTarotRoute(request, env, ctx);
}
```

Adapt `Env` typing to the Worker’s existing env interface.

### 2. Verify Supabase REST conventions

The patch uses direct Supabase REST calls with service role key:

- `apikey`
- `Authorization: Bearer <service role>`
- `Prefer: return=representation`

If the existing Worker already has a Supabase helper, replace the scaffold helper with the existing helper.

### 3. Run migration

Apply `supabase/migrations/001_tarot_tracker.sql`.

### 4. Fix route compile issues

The patch is intentionally dependency-light. It should work in a standard Cloudflare Worker TypeScript runtime. Adjust import paths only.

### 5. Wire frontend env

Set:

```bash
VITE_QI_API_BASE_URL=http://localhost:8787
```

or production Worker URL.

### 6. Add signed photo URL support

Current schema stores `photo_storage_path`. Add Worker route/helper to return a short-lived signed URL if the UI needs to display saved images after refresh.

Suggested route:

```http
GET /v1/apps/tarot/readings/:readingId/photo-url
```

### 7. Implement OCR later, not first

OCR should be a job step:

```txt
photo_storage_path -> vision/OCR attempt -> raw_ocr -> suggested cards -> human confirmation
```

Do not let OCR overwrite confirmed card names without user confirmation.

### 8. Implement interpretation

Use confirmed cards first. Photo can be context, not the source of truth.

Recommended output:

```json
{
  "summary": "string",
  "position_interpretations": [],
  "carryover_themes": [],
  "warnings": [],
  "next_question": "string"
}
```

Store final text in `tarot_readings.interpretation`; store structured output in `tarot_ai_jobs.output` or add `interpretation_json` later.

## Do not do this yet

- Do not add payments.
- Do not build a deck marketplace.
- Do not create a giant LifeOps merge.
- Do not bypass the Worker.
- Do not pretend OCR is reliable without confirmation.
