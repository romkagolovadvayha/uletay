import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

const seed = JSON.parse(await readFile(new URL('../cms/seed/content.json', import.meta.url), 'utf8'));
const result = await build({
  entryPoints: ['src/api/appDataApi.ts'], bundle: true, platform: 'node', format: 'cjs', write: false,
  define: { __DEV__: 'false' },
  plugins: [{ name: 'cache-test', setup(builder) {
    builder.onResolve({ filter: /^(react-native|@react-native-async-storage\/async-storage)$/ },
      ({ path }) => ({ path, namespace: 'cache-test' }));
    builder.onLoad({ filter: /.*/, namespace: 'cache-test' }, ({ path }) => ({ contents:
      path === 'react-native' ? 'export const Platform = { OS: "web" };' :
      'export default globalThis.__storage;',
    }));
  } }],
});
const code = result.outputFiles[0].text;
const cacheKey = '@uletay_api_cache_v5';
const oldRevision = 'a'.repeat(64);
const newRevision = 'b'.repeat(64);
const oldData = { ...seed, revision: oldRevision };
const nextData = { ...seed, festival: { ...seed.festival, name: 'Изменено в админке' }, revision: newRevision };
const serializedData = (data) => JSON.parse(JSON.stringify(data));

function client(initialData = oldData, savedValues) {
  let now = 1_000_000;
  const values = savedValues ?? new Map([['favorites', 'keep-me']]);
  if (!savedValues && initialData) values.set(cacheKey, JSON.stringify({ data: initialData, fetchedAt: now - 1000 }));
  const requests = [];
  const writes = [];
  let failWrites = false;
  let respond = async () => { throw new Error('Unexpected request'); };
  const module = { exports: {} };
  runInNewContext(code, {
    module, exports: module.exports, console, process: { env: {} }, URL,
    structuredClone, AbortController, setTimeout, clearTimeout,
    Date: class extends Date { static now() { return now; } },
    __seed: seed,
    __storage: {
      async getItem(key) { return values.get(key) ?? null; },
      async setItem(key, value) {
        writes.push(key);
        if (failWrites) throw new Error('Temporary storage failure');
        values.set(key, value);
      },
    },
    fetch: async (url, init) => { requests.push({ url, init }); return respond(); },
  });
  return {
    api: module.exports, values, requests, writes,
    respond: (fn) => { respond = fn; },
    advance: (ms) => { now += ms; },
    failWrites: (value) => { failWrites = value; },
  };
}

const c = client();
assert.equal((await c.api.refreshAppDataInBackground()).status, 'not-needed');
assert.equal(c.requests.length, 0);
c.respond(async () => Response.json(nextData));
const changed = await c.api.refreshAppDataInBackground(true);
assert.equal(changed.status, 'fresh');
assert.equal(changed.cached.data.festival.name, 'Изменено в админке');
assert.equal(c.requests[0].init.cache, 'no-store');
assert.equal(c.requests[0].init.headers['If-None-Match'], `"${oldRevision}"`);
assert.equal(JSON.parse(c.values.get(cacheKey)).data.revision, newRevision);
assert.equal(c.values.get('favorites'), 'keep-me');

c.respond(async () => new Response(null, { status: 304 }));
c.advance(29_999);
assert.equal((await c.api.refreshAppDataInBackground()).status, 'not-needed');
c.advance(1);
const unchanged = await c.api.refreshAppDataInBackground();
assert.equal(unchanged.status, 'fresh');
assert.equal(c.requests.at(-1).init.headers['If-None-Match'], `"${newRevision}"`);
assert.equal(unchanged.cached.data, changed.cached.data, 'Unchanged content retains its object identity');
assert.equal(c.writes.length, 1, '304 must not rewrite the entire catalog to storage');

c.respond(async () => Response.json(oldData, { headers: { 'X-Uletay-Offline': '1' } }));
const fallback = await c.api.refreshAppDataInBackground(true);
assert.equal(fallback.status, 'failed', 'Offline fallback is not a verified server response');
assert.equal(fallback.cached.data.revision, newRevision, 'An older service-worker cache must not roll back the app');
assert.equal(fallback.cached.fetchedAt, unchanged.cached.fetchedAt);
assert.equal(JSON.parse(c.values.get(cacheKey)).data.revision, newRevision);

const empty = client(null);
empty.respond(async () => Response.json(oldData, { headers: { 'X-Uletay-Offline': '1' } }));
const offlineStart = await empty.api.refreshAppDataInBackground(true);
assert.equal(offlineStart.status, 'failed');
assert.equal(offlineStart.cached.data.revision, oldRevision, 'Worker data is usable if no local snapshot exists');
assert.equal(offlineStart.cached.fetchedAt, 0, 'Offline data must remain eligible for revalidation');
empty.respond(async () => Response.json(nextData));
assert.equal((await empty.api.refreshAppDataInBackground()).cached.data.revision, newRevision, 'Reconnect can fetch fresh content immediately');

const parallel = client();
let finish;
parallel.respond(() => new Promise((resolve) => { finish = resolve; }));
await parallel.api.readCachedAppData();
const first = parallel.api.refreshAppDataInBackground(true);
const second = parallel.api.refreshAppDataInBackground(true);
await new Promise((resolve) => setImmediate(resolve));
assert.equal(parallel.requests.length, 1, 'Focus and reconnect share a pending request');
finish(Response.json(nextData));
assert.equal((await first).cached.data.revision, newRevision);
assert.equal((await second).cached.data.revision, newRevision);

const invalid = client();
invalid.respond(async () => Response.json({ broken: true }));
assert.equal((await invalid.api.refreshAppDataInBackground(true)).status, 'failed');
assert.equal(JSON.parse(invalid.values.get(cacheKey)).data.revision, oldRevision, 'Invalid responses cannot replace the offline snapshot');
assert.equal(invalid.requests.length, 1, 'A standalone forced refresh does not repeat non-retryable failures');

// A new JS runtime with only persistent storage, not a warm in-memory fallback.
const restarted = client(null, c.values);
restarted.advance(365 * 24 * 60 * 60 * 1000);
assert.deepEqual(serializedData((await restarted.api.readCachedAppData()).data), serializedData(changed.cached.data), 'Every catalog section survives a cold start without an expiry');
restarted.respond(async () => { throw new TypeError('Offline'); });
const failedRestart = await restarted.api.refreshAppDataInBackground(true);
assert.equal(failedRestart.status, 'failed');
assert.deepEqual(serializedData(failedRestart.cached.data), serializedData(changed.cached.data), 'Offline launch never rolls back to bundled content');
restarted.respond(async () => Response.json(oldData));
assert.equal((await restarted.api.refreshAppDataInBackground(true)).cached.data.revision, oldRevision, 'Reconnection replaces the saved snapshot');

const previousEdition = client({ ...seed, festival: { ...seed.festival, year: 2025, startDate: '2025-07-01', endDate: '2025-07-05' } });
assert.equal((await previousEdition.api.readCachedAppData()).data.festival.year, 2025, 'An app update does not discard the last received festival data');
for (const raw of ['{', 'null', '{}', JSON.stringify({ fetchedAt: 'yesterday', data: oldData }), JSON.stringify({ fetchedAt: 123, data: { ...oldData, stages: null } })]) {
  assert.equal(restarted.api.parseCachedAppData(raw), null, 'Malformed storage cannot crash hydration');
}

const storageFailure = client(null);
storageFailure.failWrites(true);
storageFailure.respond(async () => Response.json(nextData));
assert.equal((await storageFailure.api.refreshAppDataInBackground(true)).cached.data.revision, newRevision);
assert.equal(storageFailure.values.has(cacheKey), false);
storageFailure.failWrites(false);
storageFailure.respond(async () => new Response(null, { status: 304 }));
await storageFailure.api.refreshAppDataInBackground(true);
assert.equal(JSON.parse(storageFailure.values.get(cacheKey)).data.revision, newRevision, 'An unchanged response retries a previously failed disk write');
assert.equal((await client(null, storageFailure.values).api.readCachedAppData()).data.revision, newRevision);

console.log('App data cache: cold offline starts, all catalog sections, reconnect, malformed data, persistence retries, 304 and concurrent refresh passed.');
