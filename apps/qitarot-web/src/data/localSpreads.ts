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
  },
  {
    id: 'local-horseshoe-spread',
    slug: 'horseshoe',
    name: 'Horseshoe Spread',
    description: 'A classic 5-card arc showing historical trends, present triggers, obstacles, and output.',
    card_count: 5,
    positions: [
      { key: 'past', label: 'Past', prompt: 'Events shaping this question.', order: 1, x: 15, y: 60 },
      { key: 'present', label: 'Present', prompt: 'The current active status.', order: 2, x: 30, y: 35 },
      { key: 'hidden', label: 'Hidden Influences', prompt: 'Subconscious drivers or secrets.', order: 3, x: 50, y: 20 },
      { key: 'obstacles', label: 'Obstacles', prompt: 'Friction or resistance points.', order: 4, x: 70, y: 35 },
      { key: 'outcome', label: 'Outcome', prompt: 'Where this trend lands.', order: 5, x: 85, y: 60 }
    ]
  },
  {
    id: 'local-yes-no-verdict',
    slug: 'yes-no-verdict',
    name: 'Yes/No Verdict',
    description: 'Clear diagnostic spread weigh-in. Compare supporting and opposing signals for a final ruling.',
    card_count: 3,
    positions: [
      { key: 'for', label: 'Supporting Factors', prompt: 'Arguments or trends saying YES.', order: 1, x: 25, y: 50 },
      { key: 'against', label: 'Opposing Factors', prompt: 'Arguments or trends saying NO.', order: 2, x: 50, y: 50 },
      { key: 'verdict', label: 'Verdict', prompt: 'The ultimate synthesis/ruling.', order: 3, x: 75, y: 50 }
    ]
  },
  {
    id: 'local-celtic-cross',
    slug: 'celtic-cross',
    name: 'Celtic Cross',
    description: 'Traditional 10-card layout mapping foundations, crown potential, external context, and outcome.',
    card_count: 10,
    positions: [
      { key: 'present', label: 'Present', prompt: 'Core energy of the situation.', order: 1, x: 42, y: 45 },
      { key: 'cross', label: 'Crossing', prompt: 'Challenge or pressure.', order: 2, x: 42, y: 45 },
      { key: 'root', label: 'Root', prompt: 'Foundation or origin.', order: 3, x: 42, y: 68 },
      { key: 'past', label: 'Recent Past', prompt: 'What is fading or behind this.', order: 4, x: 22, y: 45 },
      { key: 'crown', label: 'Crown', prompt: 'What is visible or possible.', order: 5, x: 42, y: 22 },
      { key: 'future', label: 'Near Future', prompt: 'What comes next if the pattern continues.', order: 6, x: 62, y: 45 },
      { key: 'self', label: 'Self', prompt: 'Your stance or internal state.', order: 7, x: 82, y: 78 },
      { key: 'environment', label: 'Environment', prompt: 'Outside influence.', order: 8, x: 82, y: 58 },
      { key: 'hopes_fears', label: 'Hopes/Fears', prompt: 'Emotional charge around the situation.', order: 9, x: 82, y: 38 },
      { key: 'outcome', label: 'Outcome', prompt: 'Likely result or integration point.', order: 10, x: 82, y: 18 }
    ]
  }
];
