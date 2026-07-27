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

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

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
