import type { ApiEnvelope, Reading, ReadingInput, SpreadTemplate } from '../types';

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

  listReadings: (filters?: { subject?: string; tag?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.subject) params.set('subject', filters.subject);
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
  }
};
