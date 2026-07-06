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

Tracks spread template, `person_id`, subject/person label, reader, question, summary, interpretation, tags, photo storage path, raw OCR JSON, and AI status.

## `qitarot_reading_cards`

One row per card in a reading.

Tracks `card_id`, card slug/name/image snapshots, position key/label, order index, orientation, upright/reversed meaning snapshots, active meaning snapshot, and notes.

## `qitarot_cards`

Canonical 78-card catalog.

Tracks:

- arcana: `major` or `minor`
- suit: `wands`, `cups`, `swords`, or `pentacles`
- rank/card number
- element
- image URL
- upright/reversed keywords
- upright/reversed clinical meanings

The UI uses this table for card search, grouped browsing, image display, reversal-aware meaning snapshots, and AI prompt context.

## `qitarot_people`

Person/subject index used to group readings across time.

Creating a reading with a new person name creates a row here through the Worker.

## `qitarot_reading_links`

Optional explicit links between readings for carryover, repeated people, repeated questions, warnings, or resolved patterns.

## `qitarot_ai_jobs`

Queue table for OCR, interpretation, and correlation jobs.

The current MVP creates jobs. It does not run AI work yet.
