import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

const seed = JSON.parse(await readFile(new URL('../cms/seed/content.json', import.meta.url), 'utf8'));
const result = await build({
  entryPoints: ['src/api/appDataApi.ts'], bundle: true, platform: 'node', format: 'cjs', write: false,
  define: { __DEV__: 'false' },
  plugins: [{ name: 'cache-test', setup(builder) {
    builder.onResolve({ filter: /^(react-native|@react-native-async-storage\/async-storage|\.\.\/storage\/dataStore|\.\.\/utils\/appDataNormalize)$/ },
      ({ path }) => ({ path, namespace: 'cache-test' }));
    builder.onLoad({ filter: /.*/, namespace: 'cache-test' }, ({ path }) => ({ contents:
      path === 'react-native' ? 'export const Platform = { OS: "web" };' :
      path.includes('async-storage') ? 'export default globalThis.__storage;' :
      path.includes('dataStore') ? 'export const defaultAppData = globalThis.__seed;' :
      'export const normalizeAppData = (data) => structuredClone(data);',
    }));
  } }],
});
const code = result.outputFiles[0].text;
const cacheKey = '@uletay_api_cache_v5';
const oldRevision = 'a'.repeat(64);
const newRevision = 'b'.repeat(64);
const oldData = { ...seed, revision: oldRevision };
const nextData = { ...seed, festival: { ...seed.festival, name: 'Изменено в админке' }, revision: newRevision };

function client(initialData = oldData) {
  let now = 1_000_000;
  const values = new Map([['favorites', 'keep-me']]);
  if (initialData) values.set(cacheKey, JSON.stringify({ data: initialData, fetchedAt: now - 1000 }));
  const requests = [];
  const writes = [];
  let respond = async () => { throw new Error('Unexpected request'); };
  const module = { exports: {} };
  runInNewContext(code, {
    module, exports: module.exports, console, process: { env: {} }, URL,
    structuredClone, AbortController, setTimeout, clearTimeout,
    Date: class extends Date { static now() { return now; } },
    __seed: seed,
    __storage: {
      async getItem(key) { return values.get(key) ?? null; },
      async setItem(key, value) { writes.push(key); values.set(key, value); },
    },
    fetch: async (url, init) => { requests.push({ url, init }); return respond(); },
  });
  return {
    api: module.exports, values, requests, writes,
    respond: (fn) => { respond = fn; },
    advance: (ms) => { now += ms; },
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

console.log('App data cache: revision changes, 30-second checks, 304, concurrent refresh, offline fallback and preserved favorites passed.');
