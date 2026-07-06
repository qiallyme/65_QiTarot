import type { AnalyticsSummary, ApiEnvelope, Person, Reading, ReadingInput, SpreadTemplate, TarotCard, CardProfile } from '../types';

const API_BASE = (import.meta.env.VITE_QITAROT_API_BASE_URL || '').replace(/\/$/, '');
const APP_SLUG = import.meta.env.VITE_QITAROT_APP_SLUG || 'qitarot';
const BASE_PATH = `${API_BASE}/v1/qitarot`;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_PATH}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-QI-App': APP_SLUG,
      ...(options.headers || {})
    }
  });

  const payload = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok || !payload?.ok) {
    const message = payload?.error?.message || `API request failed: ${res.status}`;
    throw new Error(message);
  }

  return payload.data as T;
}

export const tarotApi = {
  health: () => request<{ status: string; app: string }>('/health'),

  listSpreads: () => request<SpreadTemplate[]>('/spreads'),

  listCards: (filters?: { q?: string; arcana?: string; suit?: string }) => {
    const params = new URLSearchParams();
    if (filters?.q) params.set('q', filters.q);
    if (filters?.arcana) params.set('arcana', filters.arcana);
    if (filters?.suit) params.set('suit', filters.suit);
    const query = params.toString();
    return request<TarotCard[]>(`/cards${query ? `?${query}` : ''}`);
  },

  listPeople: (filters?: { q?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.q) params.set('q', filters.q);
    if (filters?.limit) params.set('limit', String(filters.limit));
    const query = params.toString();
    return request<Person[]>(`/people${query ? `?${query}` : ''}`);
  },

  getAnalytics: () => request<AnalyticsSummary>('/analytics'),

  listReadings: (filters?: { subject?: string; person_id?: string; tag?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.subject) params.set('subject', filters.subject);
    if (filters?.person_id) params.set('person_id', filters.person_id);
    if (filters?.tag) params.set('tag', filters.tag);
    if (filters?.limit) params.set('limit', String(filters.limit));
    const query = params.toString();
    return request<Reading[]>(`/readings${query ? `?${query}` : ''}`);
  },

  createReading: (input: ReadingInput) =>
    request<Reading>('/readings', {
      method: 'POST',
      body: JSON.stringify(input)
    }),

  getReading: (readingId: string) =>
    request<Reading>(`/readings/${readingId}`),

  runOcrPreSave: async (file: File, positions: any[]) => {
    const form = new FormData();
    form.set('photo', file);
    form.set('positions', JSON.stringify(positions));

    const res = await fetch(`${BASE_PATH}/ocr`, {
      method: 'POST',
      headers: {
        'X-QI-App': APP_SLUG
      },
      body: form
    });

    const payload = (await res.json().catch(() => null)) as ApiEnvelope<any> | null;
    if (!res.ok || !payload?.ok) {
      throw new Error(payload?.error?.message || `OCR analysis failed: ${res.status}`);
    }
    return payload.data;
  },

  updateReading: (readingId: string, patch: Partial<ReadingInput>) =>
    request<Reading>(`/readings/${readingId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    }),

  uploadPhoto: async (readingId: string, file: File) => {
    const form = new FormData();
    form.set('photo', file);

    const res = await fetch(`${BASE_PATH}/readings/${readingId}/photo`, {
      method: 'POST',
      headers: {
        'X-QI-App': APP_SLUG
      },
      body: form
    });

    const payload = (await res.json().catch(() => null)) as ApiEnvelope<Reading> | null;
    if (!res.ok || !payload?.ok) {
      throw new Error(payload?.error?.message || `Photo upload failed: ${res.status}`);
    }
    return payload.data as Reading;
  },

  requestOcr: (readingId: string) =>
    request<{ job_id: string; status: string }>(`/readings/${readingId}/ocr`, { method: 'POST' }),

  requestInterpretation: (readingId: string) =>
    request<Reading>(`/readings/${readingId}/interpret`, { method: 'POST' }),

  getCorrelations: (filters?: { subject?: string; tag?: string; card?: string }) => {
    const params = new URLSearchParams();
    if (filters?.subject) params.set('subject', filters.subject);
    if (filters?.tag) params.set('tag', filters.tag);
    if (filters?.card) params.set('card', filters.card);
    const query = params.toString();
    return request<Array<{ key: string; count: number; readings: string[] }>>(`/correlations${query ? `?${query}` : ''}`);
  },

  getCardProfile: (slug: string) =>
    request<CardProfile>(`/cards/${slug}/profile`)
};
