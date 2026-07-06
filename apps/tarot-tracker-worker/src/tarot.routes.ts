import type { Env, ReadingInput } from './tarot.types';
import { corsHeaders, error, json, readJson } from './http';
import { TarotService } from './tarot.service';

function getReadingId(pathname: string) {
  const match = pathname.match(/^\/v1\/apps\/tarot\/readings\/([^/]+)/);
  return match?.[1];
}

export async function handleTarotRoute(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(env) });
  }

  const url = new URL(request.url);
  const service = new TarotService(env);

  try {
    if (url.pathname === '/v1/apps/tarot/health' && request.method === 'GET') {
      return json({ status: 'ok', app: 'tarot-tracker' }, env);
    }

    if (url.pathname === '/v1/apps/tarot/spreads' && request.method === 'GET') {
      return json(await service.listSpreads(), env);
    }

    if (url.pathname === '/v1/apps/tarot/readings' && request.method === 'GET') {
      return json(await service.listReadings(url), env);
    }

    if (url.pathname === '/v1/apps/tarot/readings' && request.method === 'POST') {
      const body = await readJson<ReadingInput>(request);
      return json(await service.createReading(body), env, 201);
    }

    const readingId = getReadingId(url.pathname);
    if (readingId && url.pathname === `/v1/apps/tarot/readings/${readingId}` && request.method === 'GET') {
      const reading = await service.getReading(readingId);
      if (!reading) return error(env, 404, 'not_found', 'Reading not found.');
      return json(reading, env);
    }

    if (readingId && url.pathname === `/v1/apps/tarot/readings/${readingId}` && request.method === 'PATCH') {
      const body = await readJson<Partial<ReadingInput>>(request);
      return json(await service.updateReading(readingId, body), env);
    }

    if (readingId && url.pathname === `/v1/apps/tarot/readings/${readingId}/photo` && request.method === 'POST') {
      const form = await request.formData();
      const photo = form.get('photo');
      if (!photo || typeof photo === 'string') return error(env, 400, 'missing_photo', 'Expected multipart field named photo.');
      return json(await service.uploadPhoto(readingId, photo), env);
    }

    if (readingId && url.pathname === `/v1/apps/tarot/readings/${readingId}/ocr` && request.method === 'POST') {
      return json(await service.createOcrJob(readingId), env, 202);
    }

    if (readingId && url.pathname === `/v1/apps/tarot/readings/${readingId}/interpret` && request.method === 'POST') {
      return json(await service.requestInterpretation(readingId), env, 202);
    }

    if (url.pathname === '/v1/apps/tarot/correlations' && request.method === 'GET') {
      return json(await service.correlations(url), env);
    }

    return error(env, 404, 'route_not_found', `No Tarot route for ${request.method} ${url.pathname}`);
  } catch (err) {
    if (err instanceof Response) return err;
    return error(env, 500, 'tarot_route_error', err instanceof Error ? err.message : 'Unknown Tarot route error.');
  }
}
