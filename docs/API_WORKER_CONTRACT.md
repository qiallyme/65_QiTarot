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
GET /v1/qitarot/cards
GET /v1/qitarot/cards/:slug/profile
GET /v1/qitarot/people
GET /v1/qitarot/analytics
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
  "person_id": "optional uuid",
  "person_name": "optional display name",
  "subject_name": "optional",
  "reader_name": "optional",
  "question": "optional",
  "summary": "optional",
  "interpretation": "optional",
  "tags": ["love", "carryover"],
  "cards": [
    {
      "card_id": "uuid",
      "card_slug": "five-of-swords",
      "position_key": "root",
      "position_label": "Root",
      "order_index": 1,
      "card_name": "Five of Swords",
      "orientation": "reversed",
      "card_image_url": "https://...",
      "meaning_snapshot": "Resolved upright or reversed catalog meaning at save time.",
      "notes": "optional"
    }
  ]
}
```

## Catalog + People

`GET /cards` returns the seeded `qitarot_cards` catalog grouped client-side by Major Arcana, Wands, Cups, Swords, and Pentacles. Query filters: `q`, `arcana`, `suit`.

`GET /cards/:slug/profile` returns card metadata plus pull frequency, upright/reversed counts, people counts, and recent pull log.

`GET /people` returns saved `qitarot_people` rows. Creating a reading with `person_name` will find or create the person server-side.

`GET /analytics` returns dashboard summaries: total readings, people, cards logged, top cards, top people, suit counts, arcana counts, and recent readings.

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
