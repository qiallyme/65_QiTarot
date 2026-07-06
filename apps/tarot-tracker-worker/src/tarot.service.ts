import type { Env, ReadingInput } from './tarot.types';
import { SupabaseRest } from './supabaseRest';

function encode(value: string) {
  return encodeURIComponent(value).replace(/'/g, '%27');
}

function normalizeTags(tags?: string[]) {
  return Array.from(new Set((tags || []).map((tag) => tag.trim().toLowerCase()).filter(Boolean)));
}

export class TarotService {
  private db: SupabaseRest;

  constructor(private env: Env) {
    this.db = new SupabaseRest(env);
  }

  async listSpreads() {
    return this.db.table('tarot_spread_templates', '?select=*&is_active=eq.true&order=sort_order.asc');
  }

  async listReadings(url: URL) {
    const params = new URLSearchParams();
    params.set('select', '*,cards:tarot_reading_cards(*)');
    params.set('order', 'created_at.desc');
    params.set('limit', url.searchParams.get('limit') || '50');

    const subject = url.searchParams.get('subject');
    const tag = url.searchParams.get('tag');
    if (subject) params.set('subject_name', `ilike.*${encode(subject)}*`);
    if (tag) params.set('tags', `cs.{${encode(tag.toLowerCase())}}`);

    return this.db.table('tarot_readings', `?${params.toString()}`);
  }

  async createReading(input: ReadingInput) {
    const tags = normalizeTags(input.tags);
    const readingRows = await this.db.table<Array<{ id: string }>>('tarot_readings', '', {
      method: 'POST',
      body: JSON.stringify({
        spread_template_id: input.spread_template_id,
        subject_name: input.subject_name || null,
        reader_name: input.reader_name || null,
        question: input.question || null,
        summary: input.summary || null,
        interpretation: input.interpretation || null,
        tags,
        ai_status: 'not_started'
      })
    });

    const reading = readingRows[0];
    if (!reading?.id) throw new Error('Reading insert did not return an id.');

    const cards = (input.cards || []).map((card) => ({
      reading_id: reading.id,
      position_key: card.position_key,
      position_label: card.position_label,
      order_index: card.order_index,
      card_name: card.card_name || null,
      orientation: card.orientation || 'upright',
      notes: card.notes || null
    }));

    if (cards.length) {
      await this.db.table('tarot_reading_cards', '', {
        method: 'POST',
        body: JSON.stringify(cards)
      });
    }

    return this.getReading(reading.id);
  }

  async getReading(id: string) {
    const params = new URLSearchParams();
    params.set('select', '*,cards:tarot_reading_cards(*)');
    params.set('id', `eq.${id}`);
    const rows = await this.db.table<unknown[]>('tarot_readings', `?${params.toString()}`);
    return rows[0] || null;
  }

  async updateReading(id: string, patch: Partial<ReadingInput>) {
    const body: Record<string, unknown> = {};
    for (const key of ['subject_name', 'reader_name', 'question', 'summary', 'interpretation', 'spread_template_id'] as const) {
      if (patch[key] !== undefined) body[key] = patch[key] || null;
    }
    if (patch.tags) body.tags = normalizeTags(patch.tags);

    if (Object.keys(body).length) {
      await this.db.table('tarot_readings', `?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
    }

    if (patch.cards) {
      await this.db.table('tarot_reading_cards', `?reading_id=eq.${id}`, { method: 'DELETE' });
      await this.db.table('tarot_reading_cards', '', {
        method: 'POST',
        body: JSON.stringify(
          patch.cards.map((card) => ({
            reading_id: id,
            position_key: card.position_key,
            position_label: card.position_label,
            order_index: card.order_index,
            card_name: card.card_name || null,
            orientation: card.orientation || 'upright',
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
    await this.db.table('tarot_readings', `?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ photo_storage_path: path })
    });
    return this.getReading(id);
  }

  async createOcrJob(id: string) {
    const rows = await this.db.table<Array<{ id: string; status: string }>>('tarot_ai_jobs', '', {
      method: 'POST',
      body: JSON.stringify({ reading_id: id, job_type: 'ocr', status: 'queued' })
    });
    await this.db.table('tarot_readings', `?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ai_status: 'queued' })
    });
    return { job_id: rows[0]?.id, status: rows[0]?.status || 'queued' };
  }

  async requestInterpretation(id: string) {
    // Scaffold behavior: enqueue the job. Actual OpenAI/Vision call belongs in the shared Worker job processor.
    await this.db.table('tarot_ai_jobs', '', {
      method: 'POST',
      body: JSON.stringify({ reading_id: id, job_type: 'interpretation', status: 'queued' })
    });
    await this.db.table('tarot_readings', `?id=eq.${id}`, {
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
}
