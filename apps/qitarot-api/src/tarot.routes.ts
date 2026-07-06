import type { Env, ReadingInput } from './tarot.types';
import { corsHeaders, error, json, readJson } from './http';
import { TarotService } from './tarot.service';

function getReadingId(pathname: string) {
  const match = pathname.match(/^\/v1\/qitarot\/readings\/([^/]+)/);
  return match?.[1];
}

export async function handleTarotRoute(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(env) });
  }

  const url = new URL(request.url);

  try {
    if (url.pathname === '/v1/qitarot/health' && request.method === 'GET') {
      return json({ status: 'ok', app: env.QITAROT_APP_SLUG || 'qitarot' }, env);
    }

    const service = new TarotService(env);

    if (url.pathname === '/v1/qitarot/spreads' && request.method === 'GET') {
      return json(await service.listSpreads(), env);
    }

    if (url.pathname === '/v1/qitarot/cards' && request.method === 'GET') {
      return json(await service.listCards(url), env);
    }

    if (url.pathname === '/v1/qitarot/people' && request.method === 'GET') {
      return json(await service.listPeople(url), env);
    }

    if (url.pathname === '/v1/qitarot/analytics' && request.method === 'GET') {
      return json(await service.analytics(url), env);
    }

    if (url.pathname === '/v1/qitarot/readings' && request.method === 'GET') {
      return json(await service.listReadings(url), env);
    }

    if (url.pathname === '/v1/qitarot/readings' && request.method === 'POST') {
      const body = await readJson<ReadingInput>(request);
      return json(await service.createReading(body), env, 201);
    }

    const readingId = getReadingId(url.pathname);
    if (readingId && url.pathname === `/v1/qitarot/readings/${readingId}` && request.method === 'GET') {
      const reading = await service.getReading(readingId);
      if (!reading) return error(env, 404, 'not_found', 'Reading not found.');
      return json(reading, env);
    }

    if (readingId && url.pathname === `/v1/qitarot/readings/${readingId}` && request.method === 'PATCH') {
      const body = await readJson<Partial<ReadingInput>>(request);
      return json(await service.updateReading(readingId, body), env);
    }

    if (readingId && url.pathname === `/v1/qitarot/readings/${readingId}/photo` && request.method === 'POST') {
      const form = await request.formData();
      const photo = form.get('photo');
      if (!photo || typeof photo === 'string') return error(env, 400, 'missing_photo', 'Expected multipart field named photo.');
      return json(await service.uploadPhoto(readingId, photo), env);
    }

    if (readingId && url.pathname === `/v1/qitarot/readings/${readingId}/ocr` && request.method === 'POST') {
      return json(await service.createOcrJob(readingId), env, 202);
    }

    if (readingId && url.pathname === `/v1/qitarot/readings/${readingId}/interpret` && request.method === 'POST') {
      return json(await service.requestInterpretation(readingId), env, 202);
    }

    if (url.pathname === '/v1/qitarot/correlations' && request.method === 'GET') {
      return json(await service.correlations(url), env);
    }

    return error(env, 404, 'route_not_found', `No QiTarot route for ${request.method} ${url.pathname}`);
  } catch (err) {
    if (err instanceof Response) return err;
    return error(env, 500, 'qitarot_route_error', err instanceof Error ? err.message : 'Unknown QiTarot route error.');
  }
}
