# QiTarot IDE / Codex Handoff

## Build Target

Make QiTarot production-ready in `C:\QiLabs\60_QiApps\65_QiTarot` as an isolated QiLabs app:

```txt
apps/qitarot-web -> apps/qitarot-api -> Supabase
```

Do not use or modify `C:\QiLabs\25_QiWorkers` for this app unless explicitly requested.

## Current State

- Frontend folder: `apps/qitarot-web`.
- Worker/API folder: `apps/qitarot-api`.
- API client points to `/v1/qitarot`.
- Supabase schema/migration is included at `supabase/migrations/001_qitarot.sql`.
- OCR and interpretation endpoints enqueue jobs but do not process them yet.

## Agent Tasks, In Order

1. Run `npm install`.
2. Apply `supabase/migrations/001_qitarot.sql`.
3. Set `apps/qitarot-api/.dev.vars`.
4. Run `npm run dev:api`.
5. Run `npm run dev:web`.
6. Confirm:

```http
GET /v1/qitarot/health
GET /v1/qitarot/spreads
POST /v1/qitarot/readings
GET /v1/qitarot/readings
```

## Supabase REST Conventions

The Worker uses direct Supabase REST calls with the service role key:

- `apikey`
- `Authorization: Bearer <service role>`
- `Prefer: return=representation`

The frontend must not call Supabase directly.

## Future Signed Photo URLs

Current schema stores `photo_storage_path`. Add a Worker route/helper later if the UI needs to display saved images after refresh.

Suggested route:

```http
GET /v1/qitarot/readings/:readingId/photo-url
```

## OCR Later, Not First

OCR should be a job step:

```txt
photo_storage_path -> vision/OCR attempt -> raw_ocr -> suggested cards -> human confirmation
```

Do not let OCR overwrite confirmed card names without user confirmation.

## Interpretation

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

Store final text in `qitarot_readings.interpretation`; store structured output in `qitarot_ai_jobs.output` or add `interpretation_json` later.

## Do Not Do This Yet

- Do not add payments.
- Do not build a deck marketplace.
- Do not create a giant LifeOps merge.
- Do not bypass the Worker.
- Do not pretend OCR is reliable without confirmation.
