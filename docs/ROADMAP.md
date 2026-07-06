# Roadmap

## Phase 1 — Working data spine

- Spread templates load from Worker/Supabase.
- Readings save to Supabase.
- Cards save in order.
- Timeline loads from Supabase.
- Tags and subject fields work.
- Photo upload stores to Supabase Storage.

## Phase 2 — AI assisted reading

- Enqueue interpretation job.
- Worker builds prompt payload.
- AI returns structured interpretation.
- User can accept/edit interpretation.
- Store accepted result.

## Phase 3 — OCR assisted capture

- Vision/OCR detects likely card names.
- UI shows confidence and asks user to confirm.
- Confirmed card data updates reading.

## Phase 4 — Carryover intelligence

- Repeated cards by person/topic.
- Repeated suits/major arcana ratio.
- Reading-to-reading links.
- Theme extraction.
- Timeline narrative: “This issue has moved from confusion → boundary → resolution.”

## Phase 5 — Polish

- Auth/tenant support.
- Saved decks.
- Better mobile capture flow.
- Export/import.
- Offline draft mode.
