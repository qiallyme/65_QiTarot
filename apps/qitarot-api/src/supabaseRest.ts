import type { Env } from './tarot.types';

export class SupabaseRest {
  private base: string;
  private key: string;

  constructor(env: Env) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    }
    this.base = env.SUPABASE_URL.replace(/\/$/, '');
    this.key = env.SUPABASE_SERVICE_ROLE_KEY;
  }

  async table<T>(table: string, query = '', init: RequestInit = {}): Promise<T> {
    const url = `${this.base}/rest/v1/${table}${query}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(init.headers || {})
      }
    });

    const text = await res.text();
    const body = text ? JSON.parse(text) : null;

    if (!res.ok) {
      throw new Error(`Supabase ${table} failed ${res.status}: ${text}`);
    }

    return body as T;
  }

  async upload(path: string, file: File): Promise<{ path: string }> {
    const bucket = 'qitarot-reading-photos';
    const url = `${this.base}/storage/v1/object/${bucket}/${path}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true'
      },
      body: file
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Supabase storage upload failed ${res.status}: ${text}`);
    }
    return { path };
  }
}
