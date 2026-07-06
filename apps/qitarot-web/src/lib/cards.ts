import { FALLBACK_CARDS } from '../data/cardCatalog';

export const MAJOR_ARCANA = FALLBACK_CARDS.filter((card) => card.arcana === 'major').map((card) => card.name);
export const ALL_TAROT_CARDS = FALLBACK_CARDS.map((card) => card.name);
