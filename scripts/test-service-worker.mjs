import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const workerSource = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

function createWorker(hostname) {
  const handlers = new Map();
  const deletedCaches = [];
  const openedCaches = [];
  let claimed = 0;
  let unregistered = 0;

  const context = {
    URL,
    Promise,
    console,
    caches: {
      async keys() {
        return ['uletay-shell-v2', 'uletay-data-v2', 'unrelated-cache'];
      },
      async delete(key) {
        deletedCaches.push(key);
        return true;
      },
      async open(key) {
        openedCaches.push(key);
        return {
          async addAll() {},
          async match() { return undefined; },
          async put() {},
        };
      },
      async match() { return undefined; },
    },
    fetch: async () => new Response('{}', { status: 200 }),
    Response,
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
  deletedCaches: ['uletay-shell-v2', 'uletay-data-v2'],
  openedCaches: [],
  unregistered: 1,
});
assert.equal(localFetchIntercepted, false);

const productionWorker = createWorker('uletayapp.ru');
await productionWorker.dispatchLifecycle('install');
await productionWorker.dispatchLifecycle('activate');
const productionState = productionWorker.getState();

assert.deepEqual(productionState.openedCaches, ['uletay-shell-v5']);
assert.deepEqual(productionState.deletedCaches, [
  'uletay-shell-v2',
  'uletay-data-v2',
]);
assert.equal(productionState.claimed, 1);
assert.equal(productionState.unregistered, 0);
assert.equal(productionWorker.handlers.has('push'), true);
assert.equal(productionWorker.handlers.has('notificationclick'), true);

console.log('Service worker: local cleanup and production offline cache behavior OK');
