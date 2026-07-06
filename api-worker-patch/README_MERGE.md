# Merge into the shared API Worker

This is a route module for the existing shared API Worker. It is not meant to replace the Worker.

## Copy files

Copy:

```txt
api-worker-patch/src/apps/tarot/
```

Into the Worker source tree, for example:

```txt
app/qifinance-worker/src/apps/tarot/
```

or whatever the current shared API Worker root is.

## Mount in `src/index.ts`

Find the current request router and add this before the generic 404:

```ts
import { handleTarotRoute } from './apps/tarot/tarot.routes';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/v1/apps/tarot')) {
      return handleTarotRoute(request, env, ctx);
    }

    // existing routes...
  }
};
```

If your Worker already uses Hono/itty-router, mount the same handler as a sub-route.

## Required Worker env/secrets

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

Optional:

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put CORS_ORIGIN
```

## Local dev

Use `.dev.vars` in the Worker root:

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
CORS_ORIGIN=http://localhost:5173
```

Then:

```bash
npm run dev
```

## Sanity checks

```bash
curl http://localhost:8787/v1/apps/tarot/health
curl http://localhost:8787/v1/apps/tarot/spreads
```
