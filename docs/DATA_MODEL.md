# QiTarot Data Model

## `qitarot_spread_templates`

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

## `qitarot_readings`

One reading session.

Tracks spread template, subject/person, reader, question, summary, interpretation, tags, photo storage path, raw OCR JSON, and AI status.

## `qitarot_reading_cards`

One row per card in a reading.

Tracks position key/label, order index, card name, orientation, and notes.

## `qitarot_reading_links`

Optional explicit links between readings for carryover, repeated people, repeated questions, warnings, or resolved patterns.

## `qitarot_ai_jobs`

Queue table for OCR, interpretation, and correlation jobs.

The current MVP creates jobs. It does not run AI work yet.
