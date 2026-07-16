const CACHE_NAME = 'qitarot-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Bypass API calls, Supabase endpoints, and non-GET requests
  if (event.request.method !== 'GET' || url.pathname.startsWith('/v1/') || url.hostname === 'api.qially.com' || url.hostname.endsWith('supabase.co') || url.hostname.endsWith('workers.dev')) {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
