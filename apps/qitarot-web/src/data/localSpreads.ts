import type { SpreadTemplate } from '../types';

export const FALLBACK_SPREADS: SpreadTemplate[] = [
  {
    id: 'local-three-card-thread',
    slug: 'three-card-thread',
    name: 'Three Card Thread',
    description: 'Fast read for past/current/next energy. Good when the question is simple or the reader is overloaded.',
    card_count: 3,
    positions: [
      { key: 'root', label: 'Root', prompt: 'What started this thread?', order: 1, x: 18, y: 52 },
      { key: 'present', label: 'Current Signal', prompt: 'What is active now?', order: 2, x: 50, y: 52 },
      { key: 'next', label: 'Next Move', prompt: 'What wants attention next?', order: 3, x: 82, y: 52 }
    ]
  },
  {
    id: 'local-seven-card-clarity',
    slug: 'seven-card-clarity',
    name: 'Seven Card Clarity Pull',
    description: 'A deeper spread for messy situations where the surface answer is not enough.',
    card_count: 7,
    positions: [
      { key: 'visible', label: 'Visible Situation', prompt: 'What is obvious?', order: 1, x: 50, y: 16 },
      { key: 'hidden', label: 'Hidden Factor', prompt: 'What is underneath?', order: 2, x: 50, y: 37 },
      { key: 'block', label: 'Block', prompt: 'What is jamming the signal?', order: 3, x: 24, y: 54 },
      { key: 'helper', label: 'Helper', prompt: 'What helps?', order: 4, x: 76, y: 54 },
      { key: 'choice', label: 'Choice Point', prompt: 'What choice is actually available?', order: 5, x: 50, y: 62 },
      { key: 'outcome', label: 'Likely Outcome', prompt: 'Where does this trend go?', order: 6, x: 35, y: 82 },
      { key: 'advice', label: 'Advice', prompt: 'What is the clean next move?', order: 7, x: 65, y: 82 }
    ]
  },
  {
    id: 'local-relationship-mirror',
    slug: 'relationship-mirror',
    name: 'Relationship Mirror',
    description: 'For checking the dynamic between two people without making the read melodramatic.',
    card_count: 5,
    positions: [
      { key: 'you', label: 'You', prompt: 'Your energy or role.', order: 1, x: 20, y: 36 },
      { key: 'them', label: 'Them', prompt: 'Their energy or role.', order: 2, x: 80, y: 36 },
      { key: 'bridge', label: 'Bridge', prompt: 'What connects you.', order: 3, x: 50, y: 50 },
      { key: 'friction', label: 'Friction', prompt: 'What complicates the dynamic.', order: 4, x: 35, y: 73 },
      { key: 'truth', label: 'Truth', prompt: 'What needs to be admitted.', order: 5, x: 65, y: 73 }
    ]
  }
];
