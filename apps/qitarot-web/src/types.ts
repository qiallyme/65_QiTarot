export type Orientation = 'upright' | 'reversed';

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
  position_key: string;
  position_label: string;
  order_index: number;
  card_name: string;
  orientation: Orientation;
  notes?: string;
};

export type ReadingCard = ReadingCardInput & {
  id: string;
};

export type ReadingInput = {
  spread_template_id: string;
  subject_name?: string;
  reader_name?: string;
  question?: string;
  summary?: string;
  interpretation?: string;
  tags: string[];
  cards: ReadingCardInput[];
};

export type Reading = {
  id: string;
  created_at: string;
  updated_at?: string;
  spread_template_id: string;
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
