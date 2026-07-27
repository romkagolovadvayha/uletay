/* Offline shell + API cache. Bump CACHE_VERSION on every deploy that must invalidate clients. */
const CACHE_VERSION = 'v2';
const SHELL_CACHE = `uletay-shell-${CACHE_VERSION}`;
const DATA_CACHE = `uletay-data-${CACHE_VERSION}`;
const APP_SHELL = ['/', '/api/data'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== DATA_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
    );
  }
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await cache.match(request)) ?? Response.error();
  }
}

/** Prefer cache for speed, but refresh in background so deploys stick. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    void networkPromise;
    return cached;
  }

  return (await networkPromise) ?? Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Never cache the service worker script itself via fetch handler.
  if (url.pathname === '/sw.js' || url.pathname === '/push-sw.js') {
    return;
  }

  if (url.pathname === '/api/data') {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      networkFirst(request, SHELL_CACHE).then(async (response) => {
        if (response.type !== 'error') {
          return response;
        }
        return (await caches.match('/')) ?? response;
      }),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/_expo/')) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
  }
});
