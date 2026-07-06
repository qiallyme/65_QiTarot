# QiTarot API Contract

Base path:

```txt
/v1/qitarot
```

The frontend should call only these Worker routes. Supabase remains private behind `qitarot-api`.

## Envelope

Successful JSON responses:

```json
{
  "ok": true,
  "data": {}
}
```

Errors:

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

```http
GET /v1/qitarot/health
GET /v1/qitarot/spreads
GET /v1/qitarot/readings?subject=Cody&tag=carryover&limit=50
POST /v1/qitarot/readings
GET /v1/qitarot/readings/:readingId
PATCH /v1/qitarot/readings/:readingId
POST /v1/qitarot/readings/:readingId/photo
POST /v1/qitarot/readings/:readingId/ocr
POST /v1/qitarot/readings/:readingId/interpret
GET /v1/qitarot/correlations?subject=Cody&tag=relationship
```

Health response:

```json
{
  "ok": true,
  "data": { "status": "ok", "app": "qitarot" }
}
```

## Create Reading Body

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

If `cards` is included in a PATCH, the API replaces the existing cards for that reading.

## Photo Upload

```http
POST /v1/qitarot/readings/:readingId/photo
Content-Type: multipart/form-data
```

Multipart field:

```txt
photo
```

The Worker stores the image in Supabase Storage bucket `qitarot-reading-photos` and writes the path to `qitarot_readings.photo_storage_path`.

## AI Job Endpoints

`POST /ocr` enqueues a `qitarot_ai_jobs` row with `job_type = ocr`.

`POST /interpret` enqueues a `qitarot_ai_jobs` row with `job_type = interpretation` and marks the reading `ai_status = queued`.

Actual OCR and interpretation processing belongs in the Worker/job processor.
