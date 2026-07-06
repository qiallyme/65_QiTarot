import type { TarotCard, TarotSuit } from '../types';

const imageUrl = (fileName: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${fileName}`;

const majorCards = [
  ['The Fool', 'RWS_Tarot_00_Fool.jpg', ['beginning', 'openness', 'risk'], ['impulsivity', 'avoidance', 'poor preparation'], 'A new cycle is beginning; the useful signal is curiosity, mobility, and willingness to learn without overcontrolling the outcome.', 'The same openness is present but poorly regulated; pause to separate genuine opportunity from avoidance, naivete, or unnecessary risk.'],
  ['The Magician', 'RWS_Tarot_01_Magician.jpg', ['agency', 'skill', 'execution'], ['manipulation', 'scattered effort', 'misuse'], 'Available resources can be organized into action; focus on deliberate execution rather than waiting for external permission.', 'Capacity exists but is being misdirected; watch for performance, manipulation, or scattered effort replacing accountable follow-through.'],
  ['The High Priestess', 'RWS_Tarot_02_High_Priestess.jpg', ['intuition', 'privacy', 'subtext'], ['withheld information', 'confusion', 'disconnection'], 'The most relevant information is subtle, private, or not yet verbal; observe patterns before forcing a conclusion.', 'Signal is obscured by secrecy, projection, or emotional noise; verify facts and avoid treating anxiety as intuition.'],
  ['The Empress', 'RWS_Tarot_03_Empress.jpg', ['growth', 'care', 'embodiment'], ['overgiving', 'stagnation', 'dependency'], 'Conditions support growth through care, receptivity, and material attention; nurture what is already showing life.', 'Care may have become indulgence, control, or depletion; restore boundaries and practical maintenance before asking for more growth.'],
  ['The Emperor', 'RWS_Tarot_04_Emperor.jpg', ['structure', 'authority', 'stability'], ['rigidity', 'control', 'instability'], 'Structure, standards, and clear authority are needed; define the frame so energy can become stable action.', 'Control is either excessive or absent; adjust the system before blaming individual effort.'],
  ['The Hierophant', 'RWS_Tarot_05_Hierophant.jpg', ['tradition', 'teaching', 'shared values'], ['dogma', 'nonconformity', 'stale rules'], 'Established knowledge, mentorship, or shared ritual can stabilize the situation; learn the rule before revising it.', 'Inherited rules may be too rigid or misapplied; identify which convention protects value and which only preserves habit.'],
  ['The Lovers', 'RWS_Tarot_06_Lovers.jpg', ['alignment', 'choice', 'relationship'], ['misalignment', 'avoidance', 'conflicted values'], 'A values-based choice is central; relationship dynamics improve when desire and principle are named together.', 'Attraction or preference is split from values; postpone commitment until the real tradeoff is explicit.'],
  ['The Chariot', 'RWS_Tarot_07_Chariot.jpg', ['direction', 'discipline', 'momentum'], ['force', 'drift', 'conflict'], 'Progress comes from disciplined direction; align competing drives toward one measurable objective.', 'Motion is not the same as control; reduce force, clarify the destination, and stop fighting the steering wheel.'],
  ['Strength', 'RWS_Tarot_08_Strength.jpg', ['patience', 'courage', 'self-regulation'], ['reactivity', 'self-doubt', 'coercion'], 'Soft control is stronger than domination; courage appears as regulation, patience, and steady contact with instinct.', 'The nervous system is leading the decision; rebuild self-trust through gentler pacing and fewer coercive tactics.'],
  ['The Hermit', 'RWS_Tarot_09_Hermit.jpg', ['reflection', 'discernment', 'solitude'], ['isolation', 'avoidance', 'lost guidance'], 'Withdraw enough to find a clean signal; solitude is useful when it produces discernment rather than disappearance.', 'Distance may be protecting avoidance; reconnect with evidence, trusted guidance, or a concrete next step.'],
  ['Wheel of Fortune', 'RWS_Tarot_10_Wheel_of_Fortune.jpg', ['cycle', 'change', 'timing'], ['instability', 'resistance', 'repetition'], 'A cycle is turning; respond to timing and pattern rather than assuming the current state is permanent.', 'The pattern is repeating without integration; identify what choice is yours inside conditions you cannot fully control.'],
  ['Justice', 'RWS_Tarot_11_Justice.jpg', ['accountability', 'balance', 'truth'], ['bias', 'avoidance', 'unfairness'], 'The situation asks for accuracy, accountability, and proportionate response; document facts before judging motives.', 'A distorted account is shaping the outcome; correct bias, evasiveness, or unequal standards before proceeding.'],
  ['The Hanged Man', 'RWS_Tarot_12_Hanged_Man.jpg', ['pause', 'surrender', 'new perspective'], ['stagnation', 'martyrdom', 'delay'], 'A pause is productive when it changes perspective; stop forcing motion and study what the suspension reveals.', 'Delay has become identity or avoidance; name the cost of staying suspended and choose a controlled release.'],
  ['Death', 'RWS_Tarot_13_Death.jpg', ['ending', 'transition', 'release'], ['resistance', 'incomplete ending', 'stasis'], 'A real ending is underway; release what has completed so energy can reorganize around what remains alive.', 'The ending is being resisted or prolonged; reduce attachment to the old form and complete the transition cleanly.'],
  ['Temperance', 'RWS_Tarot_14_Temperance.jpg', ['integration', 'moderation', 'calibration'], ['excess', 'imbalance', 'poor integration'], 'Healing comes through calibration, not extremes; combine opposing inputs until a workable middle path appears.', 'The mix is unstable; reduce intensity, correct imbalance, and give integration more time.'],
  ['The Devil', 'RWS_Tarot_15_Devil.jpg', ['attachment', 'compulsion', 'material reality'], ['release', 'awareness', 'detachment'], 'A binding pattern is visible; examine incentive, dependency, shame, or compulsion without moral drama.', 'The bond can loosen when named accurately; maintain accountability while reducing shame and fatalism.'],
  ['The Tower', 'RWS_Tarot_16_Tower.jpg', ['disruption', 'truth event', 'collapse'], ['aftershock', 'avoidance', 'controlled demolition'], 'A false structure is being disrupted; prioritize truth, safety, and rebuilding on tested assumptions.', 'The collapse may be delayed or internalized; make the necessary structural change before pressure decides for you.'],
  ['The Star', 'RWS_Tarot_17_Star.jpg', ['hope', 'renewal', 'orientation'], ['discouragement', 'depletion', 'lost faith'], 'Recovery is possible through honest renewal; orient toward what restores trust without denying the wound.', 'Hope is depleted or abstract; use small verifiable repairs instead of asking belief to carry the whole load.'],
  ['The Moon', 'RWS_Tarot_18_Moon.jpg', ['uncertainty', 'dream', 'projection'], ['clarification', 'fear exposure', 'disillusion'], 'Perception is unstable; move slowly, track dreams and fears, and avoid making uncertainty into fact.', 'Confusion is beginning to clear; separate revealed facts from the fear-story that formed around them.'],
  ['The Sun', 'RWS_Tarot_19_Sun.jpg', ['clarity', 'vitality', 'success'], ['overexposure', 'temporary low', 'blocked joy'], 'Clarity and vitality are available; let the simple truth be visible and use success to strengthen trust.', 'Joy or clarity is partially blocked; watch for burnout, overexposure, or refusal to receive an uncomplicated good.'],
  ['Judgement', 'RWS_Tarot_20_Judgement.jpg', ['reckoning', 'calling', 'review'], ['self-judgment', 'avoidance', 'unfinished review'], 'A review point has arrived; integrate the past honestly and answer the next level of responsibility.', 'The review is distorted by shame or avoidance; distinguish accountability from self-punishment.'],
  ['The World', 'RWS_Tarot_21_World.jpg', ['completion', 'integration', 'wholeness'], ['incompletion', 'loose ends', 'limited closure'], 'A cycle can complete with integration; recognize the earned result and prepare to operate from a wider frame.', 'Closure is partial; identify loose ends, withheld acknowledgment, or fear of stepping beyond the familiar.']
] as const;

const ranks = [
  ['ace', 'Ace', ['seed', 'initiation'], ['blocked start', 'misfire'], 'A seed condition is present: the domain is emerging and should be protected before it is expanded.', 'The start is blocked, premature, or under-resourced; clarify motive and conditions before committing.'],
  ['two', 'Two', ['choice', 'balance'], ['indecision', 'imbalance'], 'A decision or pairing is forming; compare options calmly and identify the minimum viable commitment.', 'Indecision, avoidance, or false equivalence is distorting the choice; reduce noise and name the real tradeoff.'],
  ['three', 'Three', ['development', 'collaboration'], ['fragmentation', 'delay'], 'Initial development is visible; coordinate with the environment and test whether support is real.', 'Growth is delayed by poor coordination, unclear roles, or assumptions that have not been validated.'],
  ['four', 'Four', ['stability', 'container'], ['stagnation', 'overcontrol'], 'A stable container is available; use it to consolidate gains and regulate the next step.', 'The container has become restrictive or stale; loosen control without destroying needed stability.'],
  ['five', 'Five', ['conflict', 'stress'], ['repair', 'de-escalation'], 'Friction exposes where the system is under strain; respond diagnostically rather than personally.', 'Conflict can de-escalate if pride drops and the actual stressor is addressed directly.'],
  ['six', 'Six', ['adjustment', 'movement'], ['dependency', 'uneven exchange'], 'A corrective movement is possible; restore proportion, reciprocity, or forward motion in the domain.', 'The adjustment is incomplete or dependent on old patterns; check whether the exchange is genuinely balanced.'],
  ['seven', 'Seven', ['assessment', 'defense'], ['avoidance', 'overwhelm'], 'Assessment is needed before action; protect the position while distinguishing threat from complexity.', 'The situation is over-defended or avoided; simplify the field and test assumptions one at a time.'],
  ['eight', 'Eight', ['practice', 'momentum'], ['misalignment', 'stall'], 'Repeated effort creates momentum; refine the process and let disciplined practice compound.', 'Effort is misdirected, stalled, or compulsive; adjust the method before adding more force.'],
  ['nine', 'Nine', ['threshold', 'resilience'], ['exhaustion', 'defensiveness'], 'The pattern is near culmination; conserve energy and use experience instead of escalating pressure.', 'Fatigue or defensiveness is distorting perception; recovery is part of completing the cycle.'],
  ['ten', 'Ten', ['completion', 'load'], ['overload', 'release'], 'The domain reaches maximum expression; acknowledge the result and prepare for redistribution or closure.', 'The load has exceeded usefulness; release, delegate, or end what no longer needs to be carried.'],
  ['page', 'Page', ['learning', 'message'], ['immaturity', 'inexperience'], 'A learning signal appears; approach the domain with curiosity, humility, and concrete observation.', 'Inexperience is showing as performance or poor follow-through; slow down and learn the basics cleanly.'],
  ['knight', 'Knight', ['pursuit', 'drive'], ['extreme', 'restlessness'], 'Directed pursuit is active; use momentum while monitoring whether speed is serving the goal.', 'Drive has become extreme, reactive, or inconsistent; regulate pace before the pursuit creates collateral cost.'],
  ['queen', 'Queen', ['maturity', 'receptivity'], ['enmeshment', 'withdrawal'], 'Mature receptive command is available; hold the domain with attunement, boundaries, and emotional intelligence.', 'The receptive function is distorted by enmeshment, withdrawal, or poor boundaries; restore self-possession.'],
  ['king', 'King', ['mastery', 'governance'], ['domination', 'instability'], 'Executive mastery is required; govern the domain through standards, responsibility, and measured authority.', 'Authority is unstable, controlling, or avoidant; correct the governance pattern before outcomes degrade.']
] as const;

const suits: Array<{
  suit: TarotSuit;
  label: string;
  element: string;
  filePrefix: string;
  domain: string;
  upright: string;
  reversed: string;
}> = [
  { suit: 'wands', label: 'Wands', element: 'fire', filePrefix: 'Wands', domain: 'will, creativity, ambition, and energetic direction', upright: 'Focus on agency, initiative, inspiration, and the management of life-force.', reversed: 'Watch for volatility, burnout, blocked desire, or performative momentum.' },
  { suit: 'cups', label: 'Cups', element: 'water', filePrefix: 'Cups', domain: 'emotion, attachment, intuition, and relational meaning', upright: 'Focus on feeling tone, attachment needs, empathy, and emotional integration.', reversed: 'Watch for avoidance, projection, emotional flooding, or unclear relational boundaries.' },
  { suit: 'swords', label: 'Swords', element: 'air', filePrefix: 'Swords', domain: 'thought, communication, conflict, and decision quality', upright: 'Focus on cognition, language, truth-testing, and clean decisions.', reversed: 'Watch for rumination, harsh framing, avoidance of facts, or adversarial thinking.' },
  { suit: 'pentacles', label: 'Pentacles', element: 'earth', filePrefix: 'Pents', domain: 'body, resources, work, health, and material stability', upright: 'Focus on practical evidence, resources, routines, and embodied outcomes.', reversed: 'Watch for scarcity patterns, inertia, overattachment, or neglect of material constraints.' }
];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const FALLBACK_CARDS: TarotCard[] = [
  ...majorCards.map((card, index) => ({
    id: `local-${slugify(card[0])}`,
    slug: slugify(card[0]),
    name: card[0],
    arcana: 'major' as const,
    suit: null,
    rank: null,
    card_number: index,
    element: null,
    image_url: imageUrl(card[1]),
    upright_keywords: [...card[2]],
    reversed_keywords: [...card[3]],
    meaning_upright: card[4],
    meaning_reversed: card[5],
    sort_order: index
  })),
  ...suits.flatMap((suit, suitIndex) =>
    ranks.map((rank, rankIndex) => {
      const name = `${rank[1]} of ${suit.label}`;
      return {
        id: `local-${slugify(name)}`,
        slug: slugify(name),
        name,
        arcana: 'minor' as const,
        suit: suit.suit,
        rank: rank[0],
        card_number: rankIndex + 1,
        element: suit.element,
        image_url: imageUrl(`${suit.filePrefix}${String(rankIndex + 1).padStart(2, '0')}.jpg`),
        upright_keywords: [...rank[2], suit.suit, suit.element],
        reversed_keywords: [...rank[3], suit.suit, suit.element],
        meaning_upright: `${rank[4]} In ${suit.domain}, ${suit.upright}`,
        meaning_reversed: `${rank[5]} In ${suit.domain}, ${suit.reversed}`,
        sort_order: 100 + (suitIndex + 1) * 20 + rankIndex + 1
      };
    })
  )
];
