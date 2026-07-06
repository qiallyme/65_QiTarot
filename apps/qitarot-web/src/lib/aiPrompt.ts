import type { ReadingInput, SpreadTemplate } from '../types';

export function buildInterpretationPrompt(reading: ReadingInput, spread?: SpreadTemplate) {
  return {
    system: 'You are interpreting a tarot spread for a tracker app. Be grounded, symbolic, and useful. Do not claim certainty. Preserve card order and spread position meanings.',
    task: 'Interpret this tarot reading and extract timeline/carryover themes.',
    spread: spread
      ? {
          name: spread.name,
          description: spread.description,
          positions: spread.positions.map((p) => ({ order: p.order, key: p.key, label: p.label, prompt: p.prompt }))
        }
      : undefined,
    reading: {
      person_id: reading.person_id,
      person_name: reading.person_name,
      subject_name: reading.subject_name,
      reader_name: reading.reader_name,
      question: reading.question,
      tags: reading.tags,
      cards: reading.cards.map((card) => ({
        card_id: card.card_id,
        card_slug: card.card_slug,
        card_name: card.card_name,
        orientation: card.orientation,
        position_key: card.position_key,
        position_label: card.position_label,
        order_index: card.order_index,
        standard_meaning: card.meaning_snapshot,
        notes: card.notes
      }))
    },
    requested_output_shape: {
      summary: '2-4 sentence plain English summary',
      position_interpretations: [{ position_key: 'string', card_name: 'string', meaning: 'string' }],
      carryover_themes: ['theme strings'],
      warnings: ['practical cautions'],
      next_question: 'suggested next spread question'
    }
  };
}
