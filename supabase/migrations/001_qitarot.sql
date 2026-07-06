-- QiTarot schema
-- Browser -> qitarot-api Worker -> Supabase. Do not expose service role keys to frontend.

create extension if not exists pgcrypto;

create table if not exists public.qitarot_spread_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  card_count integer not null check (card_count > 0),
  positions jsonb not null default '[]'::jsonb,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qitarot_readings (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'default',
  owner_id uuid null,
  spread_template_id uuid references public.qitarot_spread_templates(id),
  subject_name text,
  reader_name text,
  question text,
  summary text,
  interpretation text,
  tags text[] not null default '{}',
  photo_storage_path text,
  raw_ocr jsonb,
  ai_status text not null default 'not_started' check (ai_status in ('not_started', 'queued', 'running', 'complete', 'failed')),
  ai_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qitarot_reading_cards (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references public.qitarot_readings(id) on delete cascade,
  position_key text not null,
  position_label text not null,
  order_index integer not null,
  card_name text,
  orientation text not null default 'upright' check (orientation in ('upright', 'reversed')),
  notes text,
  created_at timestamptz not null default now(),
  unique (reading_id, order_index)
);

create table if not exists public.qitarot_reading_links (
  id uuid primary key default gen_random_uuid(),
  source_reading_id uuid not null references public.qitarot_readings(id) on delete cascade,
  target_reading_id uuid not null references public.qitarot_readings(id) on delete cascade,
  link_type text not null default 'carryover',
  reason text,
  created_at timestamptz not null default now(),
  unique (source_reading_id, target_reading_id, link_type)
);

create table if not exists public.qitarot_ai_jobs (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references public.qitarot_readings(id) on delete cascade,
  job_type text not null check (job_type in ('ocr', 'interpretation', 'correlation')),
  status text not null default 'queued' check (status in ('queued', 'running', 'complete', 'failed')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists qitarot_readings_created_at_idx on public.qitarot_readings (created_at desc);
create index if not exists qitarot_readings_subject_idx on public.qitarot_readings using gin (to_tsvector('simple', coalesce(subject_name, '') || ' ' || coalesce(question, '')));
create index if not exists qitarot_readings_tags_idx on public.qitarot_readings using gin (tags);
create index if not exists qitarot_reading_cards_card_name_idx on public.qitarot_reading_cards (lower(card_name));
create index if not exists qitarot_reading_cards_reading_order_idx on public.qitarot_reading_cards (reading_id, order_index);

create or replace function public.qitarot_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists qitarot_spread_templates_set_updated_at on public.qitarot_spread_templates;
create trigger qitarot_spread_templates_set_updated_at
before update on public.qitarot_spread_templates
for each row execute function public.qitarot_set_updated_at();

drop trigger if exists qitarot_readings_set_updated_at on public.qitarot_readings;
create trigger qitarot_readings_set_updated_at
before update on public.qitarot_readings
for each row execute function public.qitarot_set_updated_at();

drop trigger if exists qitarot_ai_jobs_set_updated_at on public.qitarot_ai_jobs;
create trigger qitarot_ai_jobs_set_updated_at
before update on public.qitarot_ai_jobs
for each row execute function public.qitarot_set_updated_at();

-- Storage bucket. This is safe to run repeatedly.
insert into storage.buckets (id, name, public)
values ('qitarot-reading-photos', 'qitarot-reading-photos', false)
on conflict (id) do nothing;

-- RLS stance:
-- This app is designed for Worker-mediated access using service role credentials.
-- Keep direct frontend access blocked unless/until auth policies are designed.
alter table public.qitarot_spread_templates enable row level security;
alter table public.qitarot_readings enable row level security;
alter table public.qitarot_reading_cards enable row level security;
alter table public.qitarot_reading_links enable row level security;
alter table public.qitarot_ai_jobs enable row level security;

-- Supabase Data API access for the Worker service role.
-- Keep anon/authenticated without grants so the browser cannot bypass qitarot-api.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.qitarot_spread_templates to service_role;
grant select, insert, update, delete on public.qitarot_readings to service_role;
grant select, insert, update, delete on public.qitarot_reading_cards to service_role;
grant select, insert, update, delete on public.qitarot_reading_links to service_role;
grant select, insert, update, delete on public.qitarot_ai_jobs to service_role;

-- Public read for spread templates is optional. If the browser never calls Supabase directly, this is not used.
drop policy if exists "spread templates are readable" on public.qitarot_spread_templates;
create policy "spread templates are readable"
on public.qitarot_spread_templates
for select
to anon, authenticated
using (is_active = true);

insert into public.qitarot_spread_templates (slug, name, description, card_count, positions, sort_order)
values
(
  'three-card-thread',
  'Three Card Thread',
  'Fast read for past/current/next energy. Good when the question is simple or the reader is overloaded.',
  3,
  '[
    {"key":"root","label":"Root","prompt":"What started this thread?","order":1,"x":18,"y":52},
    {"key":"present","label":"Current Signal","prompt":"What is active now?","order":2,"x":50,"y":52},
    {"key":"next","label":"Next Move","prompt":"What wants attention next?","order":3,"x":82,"y":52}
  ]'::jsonb,
  10
),
(
  'seven-card-clarity',
  'Seven Card Clarity Pull',
  'A deeper spread for messy situations where the surface answer is not enough.',
  7,
  '[
    {"key":"visible","label":"Visible Situation","prompt":"What is obvious?","order":1,"x":50,"y":16},
    {"key":"hidden","label":"Hidden Factor","prompt":"What is underneath?","order":2,"x":50,"y":37},
    {"key":"block","label":"Block","prompt":"What is jamming the signal?","order":3,"x":24,"y":54},
    {"key":"helper","label":"Helper","prompt":"What helps?","order":4,"x":76,"y":54},
    {"key":"choice","label":"Choice Point","prompt":"What choice is actually available?","order":5,"x":50,"y":62},
    {"key":"outcome","label":"Likely Outcome","prompt":"Where does this trend go?","order":6,"x":35,"y":82},
    {"key":"advice","label":"Advice","prompt":"What is the clean next move?","order":7,"x":65,"y":82}
  ]'::jsonb,
  20
),
(
  'relationship-mirror',
  'Relationship Mirror',
  'For checking the dynamic between two people without making the read melodramatic.',
  5,
  '[
    {"key":"you","label":"You","prompt":"Your energy or role.","order":1,"x":20,"y":36},
    {"key":"them","label":"Them","prompt":"Their energy or role.","order":2,"x":80,"y":36},
    {"key":"bridge","label":"Bridge","prompt":"What connects you.","order":3,"x":50,"y":50},
    {"key":"friction","label":"Friction","prompt":"What complicates the dynamic.","order":4,"x":35,"y":73},
    {"key":"truth","label":"Truth","prompt":"What needs to be admitted.","order":5,"x":65,"y":73}
  ]'::jsonb,
  30
),
(
  'celtic-cross-lite',
  'Celtic Cross Lite',
  'Classic broad-context reading without turning the MVP into a ritual dissertation.',
  10,
  '[
    {"key":"present","label":"Present","prompt":"Core energy of the situation.","order":1,"x":42,"y":45},
    {"key":"cross","label":"Crossing","prompt":"Challenge or pressure.","order":2,"x":42,"y":45},
    {"key":"root","label":"Root","prompt":"Foundation or origin.","order":3,"x":42,"y":68},
    {"key":"past","label":"Recent Past","prompt":"What is fading or behind this.","order":4,"x":22,"y":45},
    {"key":"crown","label":"Crown","prompt":"What is visible or possible.","order":5,"x":42,"y":22},
    {"key":"future","label":"Near Future","prompt":"What comes next if the pattern continues.","order":6,"x":62,"y":45},
    {"key":"self","label":"Self","prompt":"Your stance or internal state.","order":7,"x":82,"y":78},
    {"key":"environment","label":"Environment","prompt":"Outside influence.","order":8,"x":82,"y":58},
    {"key":"hopes_fears","label":"Hopes/Fears","prompt":"Emotional charge around the situation.","order":9,"x":82,"y":38},
    {"key":"outcome","label":"Outcome","prompt":"Likely result or integration point.","order":10,"x":82,"y":18}
  ]'::jsonb,
  40
),
(
  'horseshoe',
  'Horseshoe Spread',
  'A classic 5-card arc showing historical trends, present triggers, obstacles, and output.',
  5,
  '[
    {"key":"past","label":"Past","prompt":"Events shaping this question.","order":1,"x":15,"y":60},
    {"key":"present","label":"Present","prompt":"The current active status.","order":2,"x":30,"y":35},
    {"key":"hidden","label":"Hidden Influences","prompt":"Subconscious drivers or secrets.","order":3,"x":50,"y":20},
    {"key":"obstacles","label":"Obstacles","prompt":"Friction or resistance points.","order":4,"x":70,"y":35},
    {"key":"outcome","label":"Outcome","prompt":"Where this trend lands.","order":5,"x":85,"y":60}
  ]'::jsonb,
  50
),
(
  'yes-no-verdict',
  'Yes/No Verdict',
  'Clear diagnostic spread weigh-in. Compare supporting and opposing signals for a final ruling.',
  3,
  '[
    {"key":"for","label":"Supporting Factors","prompt":"Arguments or trends saying YES.","order":1,"x":25,"y":50},
    {"key":"against","label":"Opposing Factors","prompt":"Arguments or trends saying NO.","order":2,"x":50,"y":50},
    {"key":"verdict","label":"Verdict","prompt":"The ultimate synthesis/ruling.","order":3,"x":75,"y":50}
  ]'::jsonb,
  60
)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    card_count = excluded.card_count,
    positions = excluded.positions,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

