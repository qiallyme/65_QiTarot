# QiTarot OCR + AI Plan

## Truth

Tarot photo OCR is unreliable because decks vary widely. The stable data source must be confirmed card names and orientations.

## Correct Flow

```txt
User uploads photo
  -> Worker saves photo to Supabase Storage
  -> Worker queues OCR job
  -> Vision/OCR suggests possible cards and positions
  -> User confirms or corrects cards
  -> AI interprets confirmed spread
  -> QiTarot stores interpretation and carryover themes
```

## Minimum OCR Output

```json
{
  "confidence": 0.72,
  "detected_cards": [
    {
      "position_guess": 1,
      "card_name_guess": "Five of Swords",
      "orientation_guess": "reversed",
      "confidence": 0.66
    }
  ],
  "notes": ["Lighting is uneven", "Deck text partially obscured"]
}
```

## Interpretation Input

Use:

- spread template
- position meanings
- confirmed card names
- orientations
- question
- tags
- subject/person
- prior carryover readings, if requested

## Interpretation Guardrail

AI should say what pattern is suggested, not claim certainty. Tarot entries are reflective records, not legal, medical, or financial conclusions.
