export type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CORS_ORIGIN?: string;
  OPENAI_API_KEY?: string;
};

export type Orientation = 'upright' | 'reversed';

export type ReadingCardInput = {
  position_key: string;
  position_label: string;
  order_index: number;
  card_name: string;
  orientation: Orientation;
  notes?: string;
};

export type ReadingInput = {
  spread_template_id: string;
  subject_name?: string;
  reader_name?: string;
  question?: string;
  summary?: string;
  interpretation?: string;
  tags?: string[];
  cards?: ReadingCardInput[];
};
