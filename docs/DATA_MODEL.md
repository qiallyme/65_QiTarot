# Data Model

## `tarot_spread_templates`

Stores reusable spreads and their diagram positions.

Important fields:

- `slug`
- `name`
- `description`
- `card_count`
- `positions jsonb`

Each position includes:

```json
{
  "key": "root",
  "label": "Root",
  "prompt": "What started this thread?",
  "order": 1,
  "x": 18,
  "y": 52
}
```

`x` and `y` are percentages for diagram layout.

## `tarot_readings`

One reading session.

Tracks:

- spread template
- subject/person
- reader
- question
- summary
- interpretation
- tags
- photo storage path
- raw OCR JSON
- AI status

## `tarot_reading_cards`

One row per card in a reading.

Tracks:

- position key/label
- order index
- card name
- orientation
- notes

## `tarot_reading_links`

Optional explicit links between readings.

Useful for:

- carryover
- same person
- same question thread
- repeated warning
- resolved pattern

## `tarot_ai_jobs`

Queue table for OCR, interpretation, and correlation jobs.

Current scaffold only creates jobs. It does not run AI. That is intentional. The shared Worker/job processor should own that.
