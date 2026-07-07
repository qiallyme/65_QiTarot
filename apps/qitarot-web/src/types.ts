export type Orientation = 'upright' | 'reversed';
export type Arcana = 'major' | 'minor';
export type TarotSuit = 'wands' | 'cups' | 'swords' | 'pentacles';

export type SpreadPosition = {
  key: string;
  label: string;
  prompt: string;
  order: number;
  x: number;
  y: number;
};

export type SpreadTemplate = {
  id: string;
  slug: string;
  name: string;
  description: string;
  card_count: number;
  positions: SpreadPosition[];
};

export type ReadingCardInput = {
  card_id?: string;
  card_slug?: string;
  position_key: string;
  position_label: string;
  order_index: number;
  card_name: string;
  orientation: Orientation;
  card_image_url?: string;
  meaning_upright_snapshot?: string;
  meaning_reversed_snapshot?: string;
  meaning_snapshot?: string;
  notes?: string;
};

export type ReadingCard = ReadingCardInput & {
  id: string;
  card?: TarotCard;
};

export type ReadingInput = {
  spread_template_id: string;
  person_id?: string;
  person_name?: string;
  subject_name?: string;
  reader_name?: string;
  question?: string;
  summary?: string;
  interpretation?: string;
  tags: string[];
  cards: ReadingCardInput[];
  rating?: number;
};

export type Reading = {
  id: string;
  created_at: string;
  updated_at?: string;
  spread_template_id: string;
  person_id?: string;
  person?: Person;
  spread_name?: string;
  subject_name?: string;
  reader_name?: string;
  question?: string;
  summary?: string;
  interpretation?: string;
  tags: string[];
  photo_storage_path?: string;
  photo_url?: string;
  raw_ocr?: unknown;
  ai_status?: 'not_started' | 'queued' | 'running' | 'complete' | 'failed';
  cards: ReadingCard[];
  rating?: number;
};

export type TarotCard = {
  id: string;
  slug: string;
  name: string;
  arcana: Arcana;
  suit?: TarotSuit | null;
  rank?: string | null;
  card_number?: number | null;
  element?: string | null;
  image_url: string;
  upright_keywords: string[];
  reversed_keywords: string[];
  meaning_upright: string;
  meaning_reversed: string;
  sort_order: number;
};

export type Person = {
  id: string;
  display_name: string;
  normalized_name: string;
  notes?: string;
  tags?: string[];
};

export type AnalyticsSummary = {
  total_readings: number;
  total_cards: number;
  unique_people: number;
  top_cards: Array<{ name: string; count: number; upright: number; reversed: number }>;
  top_people: Array<{ name: string; count: number }>;
  suit_counts: Record<string, number>;
  arcana_counts: Record<string, number>;
  recent_readings: Array<{ id: string; subject_name?: string; created_at: string; cards: string[] }>;
};

export type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type CardProfile = {
  card: TarotCard;
  stats: {
    total_pulls: number;
    frequency: number;
    upright_count: number;
    reversed_count: number;
    average_position: number;
    by_person: Array<{ id: string | null; name: string; count: number }>;
  };
  pulls: Array<{
    reading_id: string;
    created_at: string;
    subject_name: string;
    reader_name: string | null;
    position_key: string;
    position_label: string;
    orientation: Orientation;
    notes: string | null;
  }>;
};
