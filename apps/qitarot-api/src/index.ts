import { handleTarotRoute } from './tarot.routes';

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-QI-App',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    const url = new URL(request.url);
    if (url.pathname.startsWith('/v1/qitarot')) {
      return handleTarotRoute(request, env, ctx);
    }

    return new Response('Not Found', { status: 404 });
  }
};
