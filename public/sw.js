/* Offline shell + API cache. Bump CACHE_VERSION on every deploy that must invalidate clients. */
const CACHE_VERSION = 'v9';
const SHELL_CACHE = `uletay-shell-${CACHE_VERSION}`;
// Content survives application updates; only a successful response replaces it.
const DATA_CACHE = 'uletay-data-v8';
const MEDIA_CACHE = 'uletay-media-v1';
// Filled with this build's scripts, fonts and local UI assets during web export.
const PRECACHE_ASSETS = [];
const APP_SHELL = ['/', ...PRECACHE_ASSETS];
const IS_LOOPBACK = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(self.location.hostname);

self.addEventListener('install', (event) => {
  if (IS_LOOPBACK) {
    event.waitUntil(self.skipWaiting());
    return;
  }

  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      if (IS_LOOPBACK) {
        await Promise.all(
          keys.filter((key) => key.startsWith('uletay-')).map((key) => caches.delete(key)),
        );
        await self.clients.claim();
        await self.registration.unregister();
        return;
      }

      await Promise.all(
        keys
          .filter((key) => key.startsWith('uletay-') && ![SHELL_CACHE, DATA_CACHE, MEDIA_CACHE].includes(key))
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
      caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('uletay-')).map((key) => caches.delete(key)))),
    );
  }
});

async function networkFirst(request, cacheName, isApiData = false) {
  // Cache Storage can be unavailable/full even while the network works.
  const cache = await caches.open(cacheName).catch(() => null);
  try {
    const response = await fetch(request, isApiData ? { cache: 'no-store' } : undefined);
    // Navigation redirects have status 0 (Fetch's opaqueredirect filter).
    // Pass them through so the browser follows the server's canonical URL.
    if (request.mode === 'navigate' && response.type === 'opaqueredirect') return response;
    if (!response.ok && response.status !== 304) throw new Error('Response unavailable');
    if (response.ok && cache) {
      await cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cached = await cache?.match(request).catch(() => undefined);
    if (cached && isApiData) {
      const headers = new Headers(cached.headers);
      headers.set('X-Uletay-Offline', '1');
      return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers });
    }
    return cached ?? Response.error();
  }
}

/** Prefer cache for speed, but refresh in background so deploys stick. */
async function staleWhileRevalidate(request, cacheName, event) {
  const cache = await caches.open(cacheName).catch(() => null);
  const cached = await cache?.match(request).catch(() => undefined);
  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response.status === 200 && cache) {
        await cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(networkPromise.then(() => {}));
    return cached;
  }

  return (await networkPromise) ?? Response.error();
}

self.addEventListener('fetch', (event) => {
  if (IS_LOOPBACK) {
    return;
  }

  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }

  // Browsers stream video with Range requests. Cache Storage rejects 206 responses;
  // let the browser handle byte ranges instead of returning a cached full response.
  if (request.headers.has('range')) {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Authenticated pages must always be checked by the server, including after logout.
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
    return;
  }

  // Never cache the service worker script itself via fetch handler.
  if (url.pathname === '/sw.js' || url.pathname === '/push-sw.js') {
    return;
  }

  if (url.pathname === '/api/data') {
    event.respondWith(networkFirst(request, DATA_CACHE, true));
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

  // Public photos uploaded by the CMS are outside /assets/. Keep viewed images
  // across deploys as well as JSON so a saved catalog looks the same offline.
  if (url.pathname.startsWith('/api/uploads/')) {
    if (/\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(url.pathname)) {
      event.respondWith(staleWhileRevalidate(request, MEDIA_CACHE, event));
    }
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/_expo/') ||
      url.pathname.startsWith('/vendor/maplibre/') || url.pathname.startsWith('/map-fonts/') ||
      (/^\/[^/]+\.(?:png|svg|webp|ico)$/.test(url.pathname))) {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE, event));
  }
});

/* global self, clients */

const SAFE_PATHS = [
  /^\/$/,
  /^\/map(?:\/[^/?#]+)?$/,
  /^\/schedule(?:\/(?:live|full)(?:\/[^/?#]+)?)?$/,
  /^\/autographs(?:\/[^/?#]+)?$/,
  /^\/favorites$/,
  /^\/playlist$/,
  /^\/headliners(?:\/[^/?#]+)?$/,
  /^\/foodcourt(?:\/[^/?#]+)?$/,
  /^\/(?:about|rules|settings|legal)$/,
];

function safeTarget(value) {
  try {
    const url = new URL(typeof value === 'string' ? value : '/', self.location.origin);
    const decodedPath = decodeURIComponent(url.pathname);
    if (url.origin === self.location.origin && SAFE_PATHS.some((pattern) => pattern.test(decodedPath))) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // Invalid values intentionally fall back to the home screen.
  }
  return '/';
}




self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }
  const title = typeof payload.title === 'string' && payload.title ? payload.title : 'УЛЕТАЙ';
  const body = typeof payload.body === 'string' ? payload.body : '';
  const url = safeTarget(payload.url);

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url },
      tag: payload.tag || undefined,
      renotify: Boolean(payload.tag),
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(safeTarget(event.notification.data?.url), self.location.origin);
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
      for (const client of windowClients) {
        if (new URL(client.url).origin !== self.location.origin) {
          continue;
        }
        await client.focus();
        if ('navigate' in client) {
          await client.navigate(target.href);
        }
        return;
      }
      await clients.openWindow(target.href);
    }),
  );
});
