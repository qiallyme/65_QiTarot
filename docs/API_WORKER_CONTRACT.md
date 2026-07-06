# Tarot Tracker API Worker Contract

Base path:

```txt
/v1/apps/tarot
```

The frontend should call only these Worker routes. Supabase remains private behind the Worker.

## Envelope

All JSON responses use:

```json
{
  "ok": true,
  "data": {}
}
```

Errors use:

```json
{
  "ok": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

## Routes

### Health

```http
GET /v1/apps/tarot/health
```

Response:

```json
{
  "ok": true,
  "data": { "status": "ok", "app": "tarot-tracker" }
}
```

### List spread templates

```http
GET /v1/apps/tarot/spreads
```

Returns active spread templates with position layout JSON.

### List readings

```http
GET /v1/apps/tarot/readings?subject=Cody&tag=carryover&limit=50
```

Supported filters:

- `subject`
- `tag`
- `limit`

### Create reading

```http
POST /v1/apps/tarot/readings
Content-Type: application/json
```

Body:

```json
{
  "spread_template_id": "uuid",
  "subject_name": "optional",
  "reader_name": "optional",
  "question": "optional",
  "summary": "optional",
  "interpretation": "optional",
  "tags": ["love", "carryover"],
  "cards": [
    {
      "position_key": "root",
      "position_label": "Root",
      "order_index": 1,
      "card_name": "Five of Swords",
      "orientation": "reversed",
      "notes": "optional"
    }
  ]
}
```

### Get reading

```http
GET /v1/apps/tarot/readings/:readingId
```

### Update reading

```http
PATCH /v1/apps/tarot/readings/:readingId
Content-Type: application/json
```

Accepts partial `ReadingInput`. If `cards` is included, the scaffold replaces existing cards for the reading.

### Upload photo

```http
POST /v1/apps/tarot/readings/:readingId/photo
Content-Type: multipart/form-data
```

Field:

```txt
photo
```

Worker stores the image in Supabase Storage bucket:

```txt
tarot-reading-photos
```

### Request OCR

```http
POST /v1/apps/tarot/readings/:readingId/ocr
```

Current scaffold enqueues a `tarot_ai_jobs` row. Actual OCR/Vision implementation belongs in the Worker/job processor.

### Request interpretation

```http
POST /v1/apps/tarot/readings/:readingId/interpret
```

Current scaffold enqueues a job and marks reading `ai_status = queued`.

### Correlations

```http
GET /v1/apps/tarot/correlations?subject=Cody&tag=relationship
```

Returns repeated cards across matching readings.

## Future hardening

- Resolve `tenant_id` from auth/session in Worker.
- Add authenticated user support.
- Replace wildcard CORS with allowed Pages domains.
- Move OCR/AI work to queue/job processor if readings become large.
