export type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CORS_ORIGIN?: string;
  QITAROT_APP_SLUG?: string;
  OPENAI_API_KEY?: string;
};

export type Orientation = 'upright' | 'reversed';

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

export type ReadingInput = {
  spread_template_id: string;
  person_id?: string;
  person_name?: string;
  subject_name?: string;
  reader_name?: string;
  question?: string;
  summary?: string;
  interpretation?: string;
  tags?: string[];
  cards?: ReadingCardInput[];
};
