import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import './test-app-data-cache.mjs';

const workerSource = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

function createWorker(hostname, options = {}) {
  const handlers = new Map();
  const deletedCaches = [];
  const openedCaches = [];
  const precachedAssets = [];
  const storedAssets = [];
  let claimed = 0;
  let unregistered = 0;

  const context = {
    URL,
    Promise,
    console,
    caches: {
      async keys() {
        return ['uletay-shell-v2', 'uletay-data-v2', 'uletay-data-v8', 'uletay-media-v1', 'unrelated-cache'];
      },
      async delete(key) {
        deletedCaches.push(key);
        return true;
      },
      async open(key) {
        openedCaches.push(key);
        if (options.openError) throw new Error('Cache storage blocked');
        return {
          async addAll(urls) { precachedAssets.push(...urls); },
          async match() { return options.cached?.clone(); },
          async put(_request, response) {
            if (response.status === 206) throw new TypeError('Partial responses cannot be cached');
            if (options.putError) throw new Error('Quota exceeded');
            storedAssets.push(_request.url);
          },
        };
      },
      async match() { return undefined; },
    },
    fetch: options.fetch ?? (async () => new Response('{}', { status: 200 })),
    Response,
    Headers,
    self: {
      location: { hostname, origin: `http://${hostname}:4174` },
      clients: {
        async claim() {
          claimed += 1;
        },
      },
      registration: {
        async unregister() {
          unregistered += 1;
          return true;
        },
      },
      async skipWaiting() {},
      addEventListener(type, handler) {
        handlers.set(type, handler);
      },
    },
  };

  runInNewContext(workerSource, context);

  async function dispatchLifecycle(type) {
    let pending = Promise.resolve();
    handlers.get(type)({
      waitUntil(value) {
        pending = Promise.resolve(value);
      },
    });
    await pending;
  }

  return {
    dispatchLifecycle,
    handlers,
    getState: () => ({ claimed, deletedCaches, openedCaches, unregistered }),
    precachedAssets, storedAssets,
  };
}

const localWorker = createWorker('127.0.0.1');
await localWorker.dispatchLifecycle('install');
await localWorker.dispatchLifecycle('activate');

let localFetchIntercepted = false;
localWorker.handlers.get('fetch')({
  request: new Request('http://127.0.0.1:4174/api/data'),
  respondWith() {
    localFetchIntercepted = true;
  },
});

assert.deepEqual(localWorker.getState(), {
  claimed: 1,
  deletedCaches: ['uletay-shell-v2', 'uletay-data-v2', 'uletay-data-v8', 'uletay-media-v1'],
  openedCaches: [],
  unregistered: 1,
});
assert.equal(localFetchIntercepted, false);

const productionWorker = createWorker('uletayapp.ru');
await productionWorker.dispatchLifecycle('install');
await productionWorker.dispatchLifecycle('activate');
const productionState = productionWorker.getState();

assert.deepEqual(productionState.openedCaches, ['uletay-shell-v9']);
assert.ok(!productionWorker.precachedAssets.includes('/api/data'), 'An unavailable API cannot prevent shell installation');
assert.deepEqual(productionState.deletedCaches, [
  'uletay-shell-v2',
  'uletay-data-v2',
]);
assert.equal(productionState.claimed, 1);
assert.equal(productionState.unregistered, 0);
assert.equal(productionWorker.handlers.has('push'), true);
assert.equal(productionWorker.handlers.has('notificationclick'), true);

let mapAssetResponse;
productionWorker.handlers.get('fetch')({
  request: new Request('http://uletayapp.ru:4174/vendor/maplibre/6.9.0/entry.mjs'),
  respondWith(value) { mapAssetResponse = value; },
  waitUntil() {},
});
assert.ok(mapAssetResponse, 'The map module participates in offline shell caching');
assert.equal((await mapAssetResponse).status, 200);

let rangeIntercepted = false;
productionWorker.handlers.get('fetch')({
  request: new Request('http://uletayapp.ru:4174/assets/background.webm', { headers: { Range: 'bytes=0-1023' } }),
  respondWith() { rangeIntercepted = true; },
});
assert.equal(rangeIntercepted, false, 'Video byte ranges must go directly to the network');

// Navigation uses redirect:manual. Browsers expose server redirects as a
// status-0 opaqueredirect response, which must reach the browser unchanged.
for (const pathname of ['/about', '/playlist', '/legal', '/headliners']) {
  for (const cached of [undefined, new Response('old page')]) {
    const redirect = { type: 'opaqueredirect', status: 0, ok: false };
    const worker = createWorker('uletayapp.ru', { cached, fetch: async () => redirect });
    const request = new Request('http://uletayapp.ru:4174' + pathname, { redirect: 'manual' });
    Object.defineProperty(request, 'mode', { value: 'navigate' });
    let response;
    worker.handlers.get('fetch')({ request, respondWith(value) { response = value; } });
    assert.equal(await response, redirect, `${pathname} must retain the server redirect with or without a cached page`);
    assert.equal(worker.storedAssets.length, 0, 'Redirects must not replace the cached page');
  }
}

for (const pathname of ['/admin', '/admin?tab=access', '/admin/login']) {
  let intercepted = false;
  const request = new Request('http://uletayapp.ru:4174' + pathname);
  Object.defineProperty(request, 'mode', { value: 'navigate' });
  productionWorker.handlers.get('fetch')({ request, respondWith() { intercepted = true; } });
  assert.equal(intercepted, false, 'Authenticated pages must not enter the offline navigation cache');
}

async function requestAsset(worker) {
  let response;
  worker.handlers.get('fetch')({
    request: new Request('http://uletayapp.ru:4174/assets/test.js'),
    respondWith(value) { response = value; },
    waitUntil() {},
  });
  return response;
}
const partialAsset = createWorker('uletayapp.ru', { fetch: async () => new Response('partial', { status: 206 }) });
assert.equal((await requestAsset(partialAsset)).status, 206, 'Partial responses must survive an unavailable cache');
for (const options of [{ openError: true }, { putError: true }]) {
  const worker = createWorker('uletayapp.ru', { ...options, fetch: async () => new Response('asset') });
  assert.equal(await (await requestAsset(worker)).text(), 'asset', 'Cache failures must not hide assets');
}

async function requestData(worker) {
  let response;
  worker.handlers.get('fetch')({
    request: new Request('http://uletayapp.ru:4174/api/data'),
    respondWith(value) { response = value; },
  });
  return response;
}

const offline = createWorker('uletayapp.ru', {
  cached: new Response('{"revision":"old"}', { headers: { ETag: '"old"' } }),
  fetch: async (_request, init) => {
    assert.equal(init.cache, 'no-store', 'API checks must bypass the browser HTTP cache');
    throw new Error('Offline');
  },
});
const fallback = await requestData(offline);
assert.equal(fallback.headers.get('X-Uletay-Offline'), '1');
assert.equal(fallback.headers.get('ETag'), '"old"');
assert.equal((await fallback.json()).revision, 'old');

for (const options of [{ openError: true }, { putError: true }]) {
  const worker = createWorker('uletayapp.ru', {
    ...options,
    cached: new Response('{"revision":"old"}'),
    fetch: async () => new Response('{"revision":"new"}'),
  });
  assert.equal((await (await requestData(worker)).json()).revision, 'new', 'Storage failure must not hide fresh API data');
}
const unchanged = createWorker('uletayapp.ru', { fetch: async () => new Response(null, { status: 304 }) });
assert.equal((await requestData(unchanged)).status, 304, 'Conditional API responses pass through');

const unavailable = createWorker('uletayapp.ru', {
  cached: Response.json({ revision: 'last-success' }),
  fetch: async () => new Response('Maintenance', { status: 503 }),
});
const duringMaintenance = await requestData(unavailable);
assert.equal(duringMaintenance.headers.get('X-Uletay-Offline'), '1');
assert.equal((await duringMaintenance.json()).revision, 'last-success', 'Server failures retain the last successful response');
assert.equal(unavailable.storedAssets.length, 0);

for (const pathname of ['/api/uploads/images/photo.webp', '/map-fonts/Uletay/0-255.pbf', '/store-app-store-icon.svg']) {
  const worker = createWorker('uletayapp.ru', {
    cached: new Response('saved-file'), fetch: async () => { throw new Error('Offline'); },
  });
  let response;
  const pending = [];
  worker.handlers.get('fetch')({
    request: new Request('http://uletayapp.ru:4174' + pathname),
    respondWith(value) { response = value; },
    waitUntil(value) { pending.push(value); },
  });
  assert.equal(await (await response).text(), 'saved-file', `${pathname} is available offline`);
  await Promise.all(pending);
  assert.equal(pending.length, 1, 'Background caching extends the worker lifetime');
}
for (const pathname of ['/api/push/subscription', '/api/uploads/private.json']) {
  let intercepted = false;
  productionWorker.handlers.get('fetch')({
    request: new Request('http://uletayapp.ru:4174' + pathname),
    respondWith() { intercepted = true; },
  });
  assert.equal(intercepted, false, 'Only public catalog content and images are cached');
}
console.log('Service worker: persistent data/photos, map fonts, server outages, storage failures, private routes and video ranges OK');
