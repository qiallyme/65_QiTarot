-- QiTarot catalog, people, and analytics foundation.
-- Frontend -> qitarot-api -> Supabase. No browser Supabase credentials.

create table if not exists public.qitarot_cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  arcana text not null check (arcana in ('major', 'minor')),
  suit text check (suit in ('wands', 'cups', 'swords', 'pentacles')),
  rank text,
  card_number integer,
  element text,
  image_url text not null,
  upright_keywords text[] not null default '{}',
  reversed_keywords text[] not null default '{}',
  meaning_upright text not null,
  meaning_reversed text not null,
  sort_order integer not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qitarot_people (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  normalized_name text not null unique,
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.qitarot_readings
  add column if not exists person_id uuid references public.qitarot_people(id);

alter table public.qitarot_reading_cards
  add column if not exists card_id uuid references public.qitarot_cards(id),
  add column if not exists card_slug text,
  add column if not exists card_image_url text,
  add column if not exists meaning_upright_snapshot text,
  add column if not exists meaning_reversed_snapshot text,
  add column if not exists meaning_snapshot text;

create or replace function public.qitarot_immutable_tsvector_simple(
  name text,
  suit text,
  rank text,
  upright_keywords text[],
  reversed_keywords text[]
)
returns tsvector
language sql
immutable
as $$
  select to_tsvector('simple', 
    coalesce(name, '') || ' ' || 
    coalesce(suit, '') || ' ' || 
    coalesce(rank, '') || ' ' || 
    coalesce(array_to_string(upright_keywords || reversed_keywords, ' '), '')
  );
$$;

create index if not exists qitarot_cards_arcana_suit_idx on public.qitarot_cards (arcana, suit, sort_order);
create index if not exists qitarot_cards_name_search_idx on public.qitarot_cards using gin (
  public.qitarot_immutable_tsvector_simple(name, suit, rank, upright_keywords, reversed_keywords)
);
create index if not exists qitarot_people_normalized_name_idx on public.qitarot_people (normalized_name);
create index if not exists qitarot_readings_person_created_idx on public.qitarot_readings (person_id, created_at desc);
create index if not exists qitarot_reading_cards_card_id_idx on public.qitarot_reading_cards (card_id);

drop trigger if exists qitarot_cards_set_updated_at on public.qitarot_cards;
create trigger qitarot_cards_set_updated_at
before update on public.qitarot_cards
for each row execute function public.qitarot_set_updated_at();

drop trigger if exists qitarot_people_set_updated_at on public.qitarot_people;
create trigger qitarot_people_set_updated_at
before update on public.qitarot_people
for each row execute function public.qitarot_set_updated_at();

alter table public.qitarot_cards enable row level security;
alter table public.qitarot_people enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.qitarot_cards to service_role;
grant select, insert, update, delete on public.qitarot_people to service_role;

with major_seed (card_number, name, file_name, upright_keywords, reversed_keywords, meaning_upright, meaning_reversed) as (
  values
  (0, 'The Fool', 'RWS_Tarot_00_Fool.jpg', array['beginning','openness','risk'], array['impulsivity','avoidance','poor preparation'], 'A new cycle is beginning; the useful signal is curiosity, mobility, and willingness to learn without overcontrolling the outcome.', 'The same openness is present but poorly regulated; pause to separate genuine opportunity from avoidance, naivete, or unnecessary risk.'),
  (1, 'The Magician', 'RWS_Tarot_01_Magician.jpg', array['agency','skill','execution'], array['manipulation','scattered effort','misuse'], 'Available resources can be organized into action; focus on deliberate execution rather than waiting for external permission.', 'Capacity exists but is being misdirected; watch for performance, manipulation, or scattered effort replacing accountable follow-through.'),
  (2, 'The High Priestess', 'RWS_Tarot_02_High_Priestess.jpg', array['intuition','privacy','subtext'], array['withheld information','confusion','disconnection'], 'The most relevant information is subtle, private, or not yet verbal; observe patterns before forcing a conclusion.', 'Signal is obscured by secrecy, projection, or emotional noise; verify facts and avoid treating anxiety as intuition.'),
  (3, 'The Empress', 'RWS_Tarot_03_Empress.jpg', array['growth','care','embodiment'], array['overgiving','stagnation','dependency'], 'Conditions support growth through care, receptivity, and material attention; nurture what is already showing life.', 'Care may have become indulgence, control, or depletion; restore boundaries and practical maintenance before asking for more growth.'),
  (4, 'The Emperor', 'RWS_Tarot_04_Emperor.jpg', array['structure','authority','stability'], array['rigidity','control','instability'], 'Structure, standards, and clear authority are needed; define the frame so energy can become stable action.', 'Control is either excessive or absent; adjust the system before blaming individual effort.'),
  (5, 'The Hierophant', 'RWS_Tarot_05_Hierophant.jpg', array['tradition','teaching','shared values'], array['dogma','nonconformity','stale rules'], 'Established knowledge, mentorship, or shared ritual can stabilize the situation; learn the rule before revising it.', 'Inherited rules may be too rigid or misapplied; identify which convention protects value and which only preserves habit.'),
  (6, 'The Lovers', 'RWS_Tarot_06_Lovers.jpg', array['alignment','choice','relationship'], array['misalignment','avoidance','conflicted values'], 'A values-based choice is central; relationship dynamics improve when desire and principle are named together.', 'Attraction or preference is split from values; postpone commitment until the real tradeoff is explicit.'),
  (7, 'The Chariot', 'RWS_Tarot_07_Chariot.jpg', array['direction','discipline','momentum'], array['force','drift','conflict'], 'Progress comes from disciplined direction; align competing drives toward one measurable objective.', 'Motion is not the same as control; reduce force, clarify the destination, and stop fighting the steering wheel.'),
  (8, 'Strength', 'RWS_Tarot_08_Strength.jpg', array['patience','courage','self-regulation'], array['reactivity','self-doubt','coercion'], 'Soft control is stronger than domination; courage appears as regulation, patience, and steady contact with instinct.', 'The nervous system is leading the decision; rebuild self-trust through gentler pacing and fewer coercive tactics.'),
  (9, 'The Hermit', 'RWS_Tarot_09_Hermit.jpg', array['reflection','discernment','solitude'], array['isolation','avoidance','lost guidance'], 'Withdraw enough to find a clean signal; solitude is useful when it produces discernment rather than disappearance.', 'Distance may be protecting avoidance; reconnect with evidence, trusted guidance, or a concrete next step.'),
  (10, 'Wheel of Fortune', 'RWS_Tarot_10_Wheel_of_Fortune.jpg', array['cycle','change','timing'], array['instability','resistance','repetition'], 'A cycle is turning; respond to timing and pattern rather than assuming the current state is permanent.', 'The pattern is repeating without integration; identify what choice is yours inside conditions you cannot fully control.'),
  (11, 'Justice', 'RWS_Tarot_11_Justice.jpg', array['accountability','balance','truth'], array['bias','avoidance','unfairness'], 'The situation asks for accuracy, accountability, and proportionate response; document facts before judging motives.', 'A distorted account is shaping the outcome; correct bias, evasiveness, or unequal standards before proceeding.'),
  (12, 'The Hanged Man', 'RWS_Tarot_12_Hanged_Man.jpg', array['pause','surrender','new perspective'], array['stagnation','martyrdom','delay'], 'A pause is productive when it changes perspective; stop forcing motion and study what the suspension reveals.', 'Delay has become identity or avoidance; name the cost of staying suspended and choose a controlled release.'),
  (13, 'Death', 'RWS_Tarot_13_Death.jpg', array['ending','transition','release'], array['resistance','incomplete ending','stasis'], 'A real ending is underway; release what has completed so energy can reorganize around what remains alive.', 'The ending is being resisted or prolonged; reduce attachment to the old form and complete the transition cleanly.'),
  (14, 'Temperance', 'RWS_Tarot_14_Temperance.jpg', array['integration','moderation','calibration'], array['excess','imbalance','poor integration'], 'Healing comes through calibration, not extremes; combine opposing inputs until a workable middle path appears.', 'The mix is unstable; reduce intensity, correct imbalance, and give integration more time.'),
  (15, 'The Devil', 'RWS_Tarot_15_Devil.jpg', array['attachment','compulsion','material reality'], array['release','awareness','detachment'], 'A binding pattern is visible; examine incentive, dependency, shame, or compulsion without moral drama.', 'The bond can loosen when named accurately; maintain accountability while reducing shame and fatalism.'),
  (16, 'The Tower', 'RWS_Tarot_16_Tower.jpg', array['disruption','truth event','collapse'], array['aftershock','avoidance','controlled demolition'], 'A false structure is being disrupted; prioritize truth, safety, and rebuilding on tested assumptions.', 'The collapse may be delayed or internalized; make the necessary structural change before pressure decides for you.'),
  (17, 'The Star', 'RWS_Tarot_17_Star.jpg', array['hope','renewal','orientation'], array['discouragement','depletion','lost faith'], 'Recovery is possible through honest renewal; orient toward what restores trust without denying the wound.', 'Hope is depleted or abstract; use small verifiable repairs instead of asking belief to carry the whole load.'),
  (18, 'The Moon', 'RWS_Tarot_18_Moon.jpg', array['uncertainty','dream','projection'], array['clarification','fear exposure','disillusion'], 'Perception is unstable; move slowly, track dreams and fears, and avoid making uncertainty into fact.', 'Confusion is beginning to clear; separate revealed facts from the fear-story that formed around them.'),
  (19, 'The Sun', 'RWS_Tarot_19_Sun.jpg', array['clarity','vitality','success'], array['overexposure','temporary low','blocked joy'], 'Clarity and vitality are available; let the simple truth be visible and use success to strengthen trust.', 'Joy or clarity is partially blocked; watch for burnout, overexposure, or refusal to receive an uncomplicated good.'),
  (20, 'Judgement', 'RWS_Tarot_20_Judgement.jpg', array['reckoning','calling','review'], array['self-judgment','avoidance','unfinished review'], 'A review point has arrived; integrate the past honestly and answer the next level of responsibility.', 'The review is distorted by shame or avoidance; distinguish accountability from self-punishment.'),
  (21, 'The World', 'RWS_Tarot_21_World.jpg', array['completion','integration','wholeness'], array['incompletion','loose ends','limited closure'], 'A cycle can complete with integration; recognize the earned result and prepare to operate from a wider frame.', 'Closure is partial; identify loose ends, withheld acknowledgment, or fear of stepping beyond the familiar.')
),
rank_seed (rank, rank_order, rank_label, upright_keywords, reversed_keywords, upright_pattern, reversed_pattern) as (
  values
  ('ace', 1, 'Ace', array['seed','initiation'], array['blocked start','misfire'], 'A seed condition is present: the domain is emerging and should be protected before it is expanded.', 'The start is blocked, premature, or under-resourced; clarify motive and conditions before committing.'),
  ('two', 2, 'Two', array['choice','balance'], array['indecision','imbalance'], 'A decision or pairing is forming; compare options calmly and identify the minimum viable commitment.', 'Indecision, avoidance, or false equivalence is distorting the choice; reduce noise and name the real tradeoff.'),
  ('three', 3, 'Three', array['development','collaboration'], array['fragmentation','delay'], 'Initial development is visible; coordinate with the environment and test whether support is real.', 'Growth is delayed by poor coordination, unclear roles, or assumptions that have not been validated.'),
  ('four', 4, 'Four', array['stability','container'], array['stagnation','overcontrol'], 'A stable container is available; use it to consolidate gains and regulate the next step.', 'The container has become restrictive or stale; loosen control without destroying needed stability.'),
  ('five', 5, 'Five', array['conflict','stress'], array['repair','de-escalation'], 'Friction exposes where the system is under strain; respond diagnostically rather than personally.', 'Conflict can de-escalate if pride drops and the actual stressor is addressed directly.'),
  ('six', 6, 'Six', array['adjustment','movement'], array['dependency','uneven exchange'], 'A corrective movement is possible; restore proportion, reciprocity, or forward motion in the domain.', 'The adjustment is incomplete or dependent on old patterns; check whether the exchange is genuinely balanced.'),
  ('seven', 7, 'Seven', array['assessment','defense'], array['avoidance','overwhelm'], 'Assessment is needed before action; protect the position while distinguishing threat from complexity.', 'The situation is over-defended or avoided; simplify the field and test assumptions one at a time.'),
  ('eight', 8, 'Eight', array['practice','momentum'], array['misalignment','stall'], 'Repeated effort creates momentum; refine the process and let disciplined practice compound.', 'Effort is misdirected, stalled, or compulsive; adjust the method before adding more force.'),
  ('nine', 9, 'Nine', array['threshold','resilience'], array['exhaustion','defensiveness'], 'The pattern is near culmination; conserve energy and use experience instead of escalating pressure.', 'Fatigue or defensiveness is distorting perception; recovery is part of completing the cycle.'),
  ('ten', 10, 'Ten', array['completion','load'], array['overload','release'], 'The domain reaches maximum expression; acknowledge the result and prepare for redistribution or closure.', 'The load has exceeded usefulness; release, delegate, or end what no longer needs to be carried.'),
  ('page', 11, 'Page', array['learning','message'], array['immaturity','inexperience'], 'A learning signal appears; approach the domain with curiosity, humility, and concrete observation.', 'Inexperience is showing as performance or poor follow-through; slow down and learn the basics cleanly.'),
  ('knight', 12, 'Knight', array['pursuit','drive'], array['extreme','restlessness'], 'Directed pursuit is active; use momentum while monitoring whether speed is serving the goal.', 'Drive has become extreme, reactive, or inconsistent; regulate pace before the pursuit creates collateral cost.'),
  ('queen', 13, 'Queen', array['maturity','receptivity'], array['enmeshment','withdrawal'], 'Mature receptive command is available; hold the domain with attunement, boundaries, and emotional intelligence.', 'The receptive function is distorted by enmeshment, withdrawal, or poor boundaries; restore self-possession.'),
  ('king', 14, 'King', array['mastery','governance'], array['domination','instability'], 'Executive mastery is required; govern the domain through standards, responsibility, and measured authority.', 'Authority is unstable, controlling, or avoidant; correct the governance pattern before outcomes degrade.')
),
suit_seed (suit, suit_order, element, file_prefix, domain, upright_domain, reversed_domain) as (
  values
  ('wands', 1, 'fire', 'Wands', 'will, creativity, ambition, and energetic direction', 'Focus on agency, initiative, inspiration, and the management of life-force.', 'Watch for volatility, burnout, blocked desire, or performative momentum.'),
  ('cups', 2, 'water', 'Cups', 'emotion, attachment, intuition, and relational meaning', 'Focus on feeling tone, attachment needs, empathy, and emotional integration.', 'Watch for avoidance, projection, emotional flooding, or unclear relational boundaries.'),
  ('swords', 3, 'air', 'Swords', 'thought, communication, conflict, and decision quality', 'Focus on cognition, language, truth-testing, and clean decisions.', 'Watch for rumination, harsh framing, avoidance of facts, or adversarial thinking.'),
  ('pentacles', 4, 'earth', 'Pents', 'body, resources, work, health, and material stability', 'Focus on practical evidence, resources, routines, and embodied outcomes.', 'Watch for scarcity patterns, inertia, overattachment, or neglect of material constraints.')
)
insert into public.qitarot_cards (
  slug,
  name,
  arcana,
  suit,
  rank,
  card_number,
  element,
  image_url,
  upright_keywords,
  reversed_keywords,
  meaning_upright,
  meaning_reversed,
  sort_order
)
select
  lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))::text as slug,
  name,
  'major',
  null,
  null,
  card_number,
  null,
  'https://commons.wikimedia.org/wiki/Special:FilePath/' || file_name,
  upright_keywords,
  reversed_keywords,
  meaning_upright,
  meaning_reversed,
  card_number
from major_seed
union all
select
  lower(regexp_replace(rank_label || ' of ' || initcap(suit), '[^a-zA-Z0-9]+', '-', 'g'))::text as slug,
  rank_label || ' of ' || initcap(suit),
  'minor',
  suit,
  rank,
  rank_order,
  element,
  'https://commons.wikimedia.org/wiki/Special:FilePath/' || file_prefix || lpad(rank_order::text, 2, '0') || '.jpg',
  upright_keywords || array[suit, element],
  reversed_keywords || array[suit, element],
  upright_pattern || ' In ' || domain || ', ' || upright_domain,
  reversed_pattern || ' In ' || domain || ', ' || reversed_domain,
  100 + (suit_order * 20) + rank_order
from suit_seed
cross join rank_seed
on conflict (slug) do update
set name = excluded.name,
    arcana = excluded.arcana,
    suit = excluded.suit,
    rank = excluded.rank,
    card_number = excluded.card_number,
    element = excluded.element,
    image_url = excluded.image_url,
    upright_keywords = excluded.upright_keywords,
    reversed_keywords = excluded.reversed_keywords,
    meaning_upright = excluded.meaning_upright,
    meaning_reversed = excluded.meaning_reversed,
    sort_order = excluded.sort_order,
    updated_at = now();

update public.qitarot_reading_cards rc
set card_id = c.id,
    card_slug = c.slug,
    card_image_url = c.image_url,
    meaning_upright_snapshot = c.meaning_upright,
    meaning_reversed_snapshot = c.meaning_reversed,
    meaning_snapshot = case when rc.orientation = 'reversed' then c.meaning_reversed else c.meaning_upright end
from public.qitarot_cards c
where rc.card_id is null
  and rc.card_name = c.name;
