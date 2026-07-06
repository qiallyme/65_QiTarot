import type { Env } from './tarot.types';

export function corsHeaders(env: Env) {
  return {
    'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-QI-App',
    'Access-Control-Max-Age': '86400'
  };
}

export function json(data: unknown, env: Env, status = 200) {
  return new Response(JSON.stringify({ ok: status < 400, data: status < 400 ? data : undefined, error: status >= 400 ? data : undefined }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(env)
    }
  });
}

export function error(env: Env, status: number, code: string, message: string, details?: unknown) {
  return json({ code, message, details }, env, status);
}

export async function readJson<T>(request: Request): Promise<T> {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Expected application/json request body.');
  }
  return request.json() as Promise<T>;
}

export function assertMethod(request: Request, allowed: string[]) {
  if (!allowed.includes(request.method)) {
    throw new Response('Method not allowed', { status: 405 });
  }
}
