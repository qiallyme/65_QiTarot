import type { Env, ReadingInput, Orientation } from './tarot.types';
import { SupabaseRest } from './supabaseRest';

function encode(value: string) {
  return encodeURIComponent(value).replace(/'/g, '%27');
}

function normalizeTags(tags?: string[]) {
  return Array.from(new Set((tags || []).map((tag) => tag.trim().toLowerCase()).filter(Boolean)));
}

function normalizePersonName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

type CatalogCard = {
  id: string;
  slug: string;
  name: string;
  image_url: string;
  arcana: 'major' | 'minor';
  suit?: string | null;
  rank?: string | null;
  meaning_upright: string;
  meaning_reversed: string;
};

export class TarotService {
  private db: SupabaseRest;

  constructor(private env: Env) {
    this.db = new SupabaseRest(env);
  }

  async listSpreads() {
    return this.db.table('qitarot_spread_templates', '?select=*&is_active=eq.true&order=sort_order.asc');
  }

  async listCards(url: URL) {
    const params = new URLSearchParams();
    params.set('select', '*');
    params.set('order', 'sort_order.asc');

    const query = url.searchParams.get('q')?.trim();
    const arcana = url.searchParams.get('arcana')?.trim();
    const suit = url.searchParams.get('suit')?.trim();

    if (arcana) params.set('arcana', `eq.${encode(arcana)}`);
    if (suit) params.set('suit', `eq.${encode(suit)}`);
    if (query) params.set('or', `(name.ilike.*${encode(query)}*,suit.ilike.*${encode(query)}*,rank.ilike.*${encode(query)}*)`);

    return this.db.table('qitarot_cards', `?${params.toString()}`);
  }

  async listPeople(url: URL) {
    const params = new URLSearchParams();
    params.set('select', '*');
    params.set('order', 'display_name.asc');
    params.set('limit', url.searchParams.get('limit') || '100');

    const query = url.searchParams.get('q')?.trim();
    if (query) params.set('display_name', `ilike.*${encode(query)}*`);

    return this.db.table('qitarot_people', `?${params.toString()}`);
  }

  async listReadings(url: URL) {
    const params = new URLSearchParams();
    params.set('select', '*,person:qitarot_people(*),cards:qitarot_reading_cards(*,card:qitarot_cards(*))');
    params.set('order', 'created_at.desc');
    params.set('limit', url.searchParams.get('limit') || '50');

    const subject = url.searchParams.get('subject');
    const personId = url.searchParams.get('person_id');
    const tag = url.searchParams.get('tag');
    if (subject) params.set('subject_name', `ilike.*${encode(subject)}*`);
    if (personId) params.set('person_id', `eq.${encode(personId)}`);
    if (tag) params.set('tags', `cs.{${encode(tag.toLowerCase())}}`);

    return this.db.table('qitarot_readings', `?${params.toString()}`);
  }

  private async resolvePerson(input: ReadingInput) {
    const name = (input.person_name || input.subject_name || '').trim();
    if (input.person_id || !name) {
      return { person_id: input.person_id || null, subject_name: input.subject_name || name || null };
    }

    const normalized = normalizePersonName(name);
    const existing = await this.db.table<Array<{ id: string; display_name: string }>>(
      'qitarot_people',
      `?select=id,display_name&normalized_name=eq.${encode(normalized)}&limit=1`
    );
    if (existing[0]) {
      return { person_id: existing[0].id, subject_name: input.subject_name || existing[0].display_name };
    }

    const created = await this.db.table<Array<{ id: string; display_name: string }>>('qitarot_people', '', {
      method: 'POST',
      body: JSON.stringify({ display_name: name, normalized_name: normalized })
    });
    return { person_id: created[0]?.id || null, subject_name: input.subject_name || name };
  }

  private async hydrateCards(cards: ReadingInput['cards'] = []) {
    const ids = Array.from(new Set(cards.map((card) => card.card_id).filter(Boolean))) as string[];
    if (!ids.length) return cards;

    const catalogRows = await this.db.table<CatalogCard[]>(
      'qitarot_cards',
      `?select=id,slug,name,image_url,arcana,suit,rank,meaning_upright,meaning_reversed&id=in.(${ids.join(',')})`
    );
    const catalogById = new Map(catalogRows.map((card) => [card.id, card]));

    return cards.map((card) => {
      const catalogCard = card.card_id ? catalogById.get(card.card_id) : undefined;
      if (!catalogCard) return card;
      const meaningSnapshot = card.orientation === 'reversed' ? catalogCard.meaning_reversed : catalogCard.meaning_upright;
      return {
        ...card,
        card_slug: catalogCard.slug,
        card_name: catalogCard.name,
        card_image_url: catalogCard.image_url,
        meaning_upright_snapshot: catalogCard.meaning_upright,
        meaning_reversed_snapshot: catalogCard.meaning_reversed,
        meaning_snapshot: card.meaning_snapshot || meaningSnapshot
      };
    });
  }

  async createReading(input: ReadingInput) {
    const tags = normalizeTags(input.tags);
    const person = await this.resolvePerson(input);
    const readingRows = await this.db.table<Array<{ id: string }>>('qitarot_readings', '', {
      method: 'POST',
      body: JSON.stringify({
        spread_template_id: input.spread_template_id,
        person_id: person.person_id,
        subject_name: person.subject_name,
        reader_name: input.reader_name || null,
        question: input.question || null,
        summary: input.summary || null,
        interpretation: input.interpretation || null,
        tags,
        rating: input.rating || null,
        ai_status: 'not_started'
      })
    });

    const reading = readingRows[0];
    if (!reading?.id) throw new Error('Reading insert did not return an id.');

    const hydratedCards = await this.hydrateCards(input.cards);
    const cards = (hydratedCards || []).map((card) => ({
      reading_id: reading.id,
      card_id: card.card_id || null,
      card_slug: card.card_slug || null,
      position_key: card.position_key,
      position_label: card.position_label,
      order_index: card.order_index,
      card_name: card.card_name || null,
      orientation: card.orientation || 'upright',
      card_image_url: card.card_image_url || null,
      meaning_upright_snapshot: card.meaning_upright_snapshot || null,
      meaning_reversed_snapshot: card.meaning_reversed_snapshot || null,
      meaning_snapshot: card.meaning_snapshot || null,
      notes: card.notes || null
    }));

    if (cards.length) {
      await this.db.table('qitarot_reading_cards', '', {
        method: 'POST',
        body: JSON.stringify(cards)
      });
    }

    return this.getReading(reading.id);
  }

  async getReading(id: string) {
    const params = new URLSearchParams();
    params.set('select', '*,person:qitarot_people(*),cards:qitarot_reading_cards(*,card:qitarot_cards(*))');
    params.set('id', `eq.${id}`);
    const rows = await this.db.table<unknown[]>('qitarot_readings', `?${params.toString()}`);
    return rows[0] || null;
  }

  async updateReading(id: string, patch: Partial<ReadingInput>) {
    const body: Record<string, unknown> = {};
    for (const key of ['subject_name', 'reader_name', 'question', 'summary', 'interpretation', 'spread_template_id', 'person_id', 'rating'] as const) {
      if (patch[key] !== undefined) body[key] = patch[key] || null;
    }
    if (patch.person_name) {
      const person = await this.resolvePerson(patch as ReadingInput);
      body.person_id = person.person_id;
      body.subject_name = person.subject_name;
    }
    if (patch.tags) body.tags = normalizeTags(patch.tags);

    if (Object.keys(body).length) {
      await this.db.table('qitarot_readings', `?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
    }

    if (patch.cards) {
      const hydratedCards = await this.hydrateCards(patch.cards);
      await this.db.table('qitarot_reading_cards', `?reading_id=eq.${id}`, { method: 'DELETE' });
      await this.db.table('qitarot_reading_cards', '', {
        method: 'POST',
        body: JSON.stringify(
          hydratedCards.map((card) => ({
            reading_id: id,
            card_id: card.card_id || null,
            card_slug: card.card_slug || null,
            position_key: card.position_key,
            position_label: card.position_label,
            order_index: card.order_index,
            card_name: card.card_name || null,
            orientation: card.orientation || 'upright',
            card_image_url: card.card_image_url || null,
            meaning_upright_snapshot: card.meaning_upright_snapshot || null,
            meaning_reversed_snapshot: card.meaning_reversed_snapshot || null,
            meaning_snapshot: card.meaning_snapshot || null,
            notes: card.notes || null
          }))
        )
      });
    }

    return this.getReading(id);
  }

  async uploadPhoto(id: string, file: File) {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${id}/spread-photo.${ext}`;
    await this.db.upload(path, file);
    await this.db.table('qitarot_readings', `?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ photo_storage_path: path })
    });
    return this.getReading(id);
  }

  async createOcrJob(id: string) {
    const rows = await this.db.table<Array<{ id: string; status: string }>>('qitarot_ai_jobs', '', {
      method: 'POST',
      body: JSON.stringify({ reading_id: id, job_type: 'ocr', status: 'queued' })
    });
    await this.db.table('qitarot_readings', `?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ai_status: 'queued' })
    });
    return { job_id: rows[0]?.id, status: rows[0]?.status || 'queued' };
  }

  async requestInterpretation(id: string) {
    await this.db.table('qitarot_ai_jobs', '', {
      method: 'POST',
      body: JSON.stringify({ reading_id: id, job_type: 'interpretation', status: 'queued' })
    });
    await this.db.table('qitarot_readings', `?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ai_status: 'queued' })
    });
    return this.getReading(id);
  }

  async correlations(url: URL) {
    const readings = await this.listReadings(url) as Array<{ id: string; cards?: Array<{ card_name?: string }> }>;
    const counts = new Map<string, { key: string; count: number; readings: string[] }>();
    for (const reading of readings) {
      for (const card of reading.cards || []) {
        if (!card.card_name) continue;
        const existing = counts.get(card.card_name) || { key: card.card_name, count: 0, readings: [] };
        existing.count += 1;
        existing.readings.push(reading.id);
        counts.set(card.card_name, existing);
      }
    }
    return Array.from(counts.values()).filter((row) => row.count > 1).sort((a, b) => b.count - a.count);
  }

  async analytics(url: URL) {
    const readings = await this.listReadings(new URL(`${url.origin}${url.pathname}?limit=500`)) as Array<{
      id: string;
      subject_name?: string;
      person_id?: string;
      person?: { display_name?: string };
      created_at: string;
      cards?: Array<{
        card_name?: string;
        orientation?: Orientation;
        card?: { name?: string; arcana?: string; suit?: string };
      }>;
    }>;

    const cardCounts = new Map<string, { name: string; count: number; upright: number; reversed: number }>();
    const suitCounts = new Map<string, number>();
    const arcanaCounts = new Map<string, number>();
    const people = new Map<string, { name: string; count: number }>();

    for (const reading of readings) {
      const personKey = reading.person_id || reading.subject_name || 'unassigned';
      const personName = reading.person?.display_name || reading.subject_name || 'Unassigned';
      const person = people.get(personKey) || { name: personName, count: 0 };
      person.count += 1;
      people.set(personKey, person);

      for (const cardRow of reading.cards || []) {
        const name = cardRow.card?.name || cardRow.card_name;
        if (!name) continue;
        const cardCount = cardCounts.get(name) || { name, count: 0, upright: 0, reversed: 0 };
        cardCount.count += 1;
        if (cardRow.orientation === 'reversed') cardCount.reversed += 1;
        else cardCount.upright += 1;
        cardCounts.set(name, cardCount);

        if (cardRow.card?.suit) suitCounts.set(cardRow.card.suit, (suitCounts.get(cardRow.card.suit) || 0) + 1);
        if (cardRow.card?.arcana) arcanaCounts.set(cardRow.card.arcana, (arcanaCounts.get(cardRow.card.arcana) || 0) + 1);
      }
    }

    return {
      total_readings: readings.length,
      total_cards: Array.from(cardCounts.values()).reduce((sum, row) => sum + row.count, 0),
      unique_people: Array.from(people.values()).filter((row) => row.name !== 'Unassigned').length,
      top_cards: Array.from(cardCounts.values()).sort((a, b) => b.count - a.count).slice(0, 8),
      top_people: Array.from(people.values()).sort((a, b) => b.count - a.count).slice(0, 6),
      suit_counts: Object.fromEntries(suitCounts),
      arcana_counts: Object.fromEntries(arcanaCounts),
      recent_readings: readings.slice(0, 5).map((reading) => ({
        id: reading.id,
        subject_name: reading.person?.display_name || reading.subject_name,
        created_at: reading.created_at,
        cards: (reading.cards || []).map((card) => card.card?.name || card.card_name).filter(Boolean)
      }))
    };
  }

  async getCardProfile(slug: string) {
    const cardRows = await this.db.table<CatalogCard[]>(
      'qitarot_cards',
      `?select=*&slug=eq.${encode(slug)}&limit=1`
    );
    const card = cardRows[0];
    if (!card) throw new Error('Card not found');

    const allReadings = await this.db.table<Array<{ id: string }>>(
      'qitarot_readings',
      `?select=id`
    );
    const totalReadings = allReadings.length;

    const pulls = await this.db.table<any[]>(
      'qitarot_reading_cards',
      `?select=*,reading:qitarot_readings(*,person:qitarot_people(*))&card_id=eq.${card.id}`
    );

    const totalPulls = pulls.length;
    let uprightCount = 0;
    let reversedCount = 0;
    let sumOrderIndex = 0;
    const peopleCounts = new Map<string, { id: string | null; name: string; count: number }>();

    const playByPlay = [];

    for (const pull of pulls) {
      if (pull.orientation === 'reversed') reversedCount++;
      else uprightCount++;
      sumOrderIndex += pull.order_index || 0;

      const reading = pull.reading;
      if (reading) {
        const personId = reading.person_id || null;
        const personName = reading.person?.display_name || reading.subject_name || 'Unassigned';
        const key = personId || personName;
        const existing = peopleCounts.get(key) || { id: personId, name: personName, count: 0 };
        existing.count++;
        peopleCounts.set(key, existing);

        playByPlay.push({
          reading_id: reading.id,
          created_at: reading.created_at,
          subject_name: personName,
          reader_name: reading.reader_name,
          position_key: pull.position_key,
          position_label: pull.position_label,
          orientation: pull.orientation,
          notes: pull.notes
        });
      }
    }

    playByPlay.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const byPerson = Array.from(peopleCounts.values()).sort((a, b) => b.count - a.count);
    const frequency = totalReadings > 0 ? totalPulls / totalReadings : 0;
    const averagePosition = totalPulls > 0 ? sumOrderIndex / totalPulls : 0;

    return {
      card,
      stats: {
        total_pulls: totalPulls,
        frequency,
        upright_count: uprightCount,
        reversed_count: reversedCount,
        average_position: averagePosition,
        by_person: byPerson
      },
      pulls: playByPlay
    };
  }

  async ocrSpreadImage(file: File, positions: any[]) {
    if (!this.env.OPENAI_API_KEY) {
      const cards = await this.db.table<any[]>('qitarot_cards', '?limit=10');
      return {
        cards: positions.map((pos, idx) => {
          const card = cards[idx % cards.length] || { name: 'The Fool', slug: 'the-fool' };
          return {
            position_key: pos.key,
            card_name: card.name,
            orientation: Math.random() > 0.5 ? 'upright' : 'reversed'
          };
        })
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a Tarot card reader OCR scanner. Identify the Tarot cards in the uploaded image. We are using a spread layout with the following positions:
${JSON.stringify(positions.map(p => ({ key: p.key, label: p.label, prompt: p.prompt })))}
Identify which card is present in which slot (choose canonical names from Rider-Waite-Smith) and its orientation (upright or reversed).
Return JSON object: { "cards": [ { "position_key": "...", "card_name": "...", "orientation": "upright" | "reversed" } ] }`
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${file.type};base64,${base64}` }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI Vision OCR failed: ${errText}`);
    }

    const payload = await response.json() as any;
    const content = payload.choices?.[0]?.message?.content;
    return JSON.parse(content);
  }

  async runBackgroundInterpretation(id: string) {
    try {
      const reading = await this.getReading(id) as any;
      if (!reading) return;

      const spreadRows = await this.db.table<any[]>('qitarot_spread_templates', `?id=eq.${reading.spread_template_id}`);
      const spread = spreadRows[0];

      let interpretation = '';
      let summary = '';

      if (!this.env.OPENAI_API_KEY) {
        await new Promise(r => setTimeout(r, 4000));
        interpretation = `The combination of cards drawn for ${reading.subject_name || 'this session'} highlights a pivotal transition path. Specifically, ${reading.cards.map((c: any) => `${c.card_name} in the ${c.position_label} position (${c.orientation})`).join(', ')} suggests that while clear obstacles exist, they are balanced by supporting signals. Focus on immediate practical grounding, and allow the seeds of change to establish deep roots before taking excessive risks.`;
        summary = `A powerful moment of transition asking for calibration and clear grounding.`;
      } else {
        const prompt = `You are a Tarot interpretation guide. Read this tarot draw:
Subject: ${reading.subject_name || 'Querent'}
Question: ${reading.question || 'General reading'}
Spread: ${spread?.name} (${spread?.description})
Cards:
${reading.cards.map((c: any) => `- ${c.position_label}: ${c.card_name} (${c.orientation}) - Notes: ${c.notes}`).join('\n')}

Provide:
1. A summary of the reading (max 100 characters).
2. A detailed tarot interpretation explaining the cards, dynamic carryover, and final verdict.
Return JSON structure:
{
  "summary": "...",
  "interpretation": "..."
}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: 'You are a Tarot interpreter. Return JSON only.' },
              { role: 'user', content: prompt }
            ]
          })
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json() as any;
        const result = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        summary = result.summary || '';
        interpretation = result.interpretation || '';
      }

      await this.db.table('qitarot_readings', `?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          summary,
          interpretation,
          ai_status: 'complete'
        })
      });
    } catch (err) {
      console.error('AI interpretation failed:', err);
      await this.db.table('qitarot_readings', `?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ai_status: 'failed'
        })
      });
    }
  }

  async generateDraftInterpretation(input: ReadingInput) {
    const cards = input.cards || [];
    if (!cards.some(c => c.card_name)) {
      return { summary: '', interpretation: '' };
    }

    const spreadRows = await this.db.table<any[]>('qitarot_spread_templates', `?id=eq.${input.spread_template_id}`);
    const spread = spreadRows[0];

    let interpretation = '';
    let summary = '';

    if (!this.env.OPENAI_API_KEY) {
      interpretation = `[Draft Interpretation Fallback] The card configuration drawn for ${input.subject_name || 'the subject'} hints at emerging energy patterns. You have placed: ${cards.filter(c => c.card_name).map(c => `${c.card_name} (${c.orientation})`).join(', ')}. Examine notes and refine context.`;
      summary = `Emerging energetic alignment for ${input.subject_name || 'subject'}.`;
    } else {
      const prompt = `You are a Tarot interpretation guide. Read this tarot draw draft:
Subject: ${input.subject_name || 'Querent'}
Question: ${input.question || 'General reading'}
Spread: ${spread?.name || 'Three Card Thread'}
Cards:
${cards.filter(c => c.card_name).map((c: any) => `- ${c.position_label}: ${c.card_name} (${c.orientation}) - Notes: ${c.notes || ''}`).join('\n')}

Provide:
1. A summary of the reading (max 100 characters).
2. A detailed tarot interpretation explaining the cards, dynamic carryover, and final verdict.
Return JSON structure:
{
  "summary": "...",
  "interpretation": "..."
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are a Tarot interpreter. Return JSON only.' },
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json() as any;
      const result = JSON.parse(data.choices?.[0]?.message?.content || '{}');
      summary = result.summary || '';
      interpretation = result.interpretation || '';
    }

    return { summary, interpretation };
  }

  async deleteReading(id: string) {
    return this.db.table('qitarot_readings', `?id=eq.${id}`, {
      method: 'DELETE'
    });
  }

  async analyzeHistoryChat(message: string, url: URL) {
    const readings = await this.listReadings(new URL(`${url.origin}/v1/qitarot/readings?limit=25`)) as any[];
    
    const formattedHistory = readings.map((r, idx) => {
      const cards = (r.cards || []).map((c: any) => `${c.position_label}: ${c.card_name} (${c.orientation})`).join(', ');
      return `Reading ${idx + 1} (${new Date(r.created_at).toLocaleDateString()}):
Subject: ${r.subject_name || 'Querent'}
Question: ${r.question || 'General'}
Cards: ${cards}
Summary: ${r.summary || 'None'}
Interpretation: ${r.interpretation || 'None'}`;
    }).join('\n\n');

    if (!this.env.OPENAI_API_KEY) {
      return {
        answer: `I see you have logged **${readings.length} readings** in your history logs.\n\nBased on your history, there is a recurring energetic alignment. To get personalized analysis, please supply your OpenAI API key in system configurations.`
      };
    }

    const systemPrompt = `You are a Tarot Analyst AI. You analyze a user's tarot reading history to answer their questions about patterns, frequent cards, themes, or insights.
Here is the user's recent reading history (most recent first):
${formattedHistory}

Answer the user's question accurately, seriously, and insightfully based on this history. Mention specific cards, dates, or questions from the logs when relevant. Keep your response in structured markdown with bold titles.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json() as any;
    return {
      answer: data.choices?.[0]?.message?.content || 'I could not process the history analysis.'
    };
  }
}
