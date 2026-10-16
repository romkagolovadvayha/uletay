import assert from 'node:assert/strict';
import { createHash, createECDH, randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { saveContentSnapshot } from '../cms/scripts/save-content-snapshot.mjs';

const require = createRequire(import.meta.url);
const temporary = await mkdtemp(path.join(tmpdir(), 'uletay-regressions-'));
const hash = (text) => createHash('sha256').update(text).digest('hex');
const seed = JSON.parse(await readFile(new URL('../cms/seed/content.json', import.meta.url), 'utf8'));
let stored = JSON.stringify(seed);
let failWrite = false;
const connection = {
  async query(sql, args) {
    if (sql.startsWith('SELECT SHA2')) return [[{ revision: hash(stored) }]];
    if (sql.startsWith('SELECT content')) return [[{ content: stored, revision: hash(stored) }]];
    if (sql.startsWith('UPDATE app_content')) {
      if (failWrite) throw new Error('Simulated database failure');
      const expected = sql.includes('SHA2(?, 256)') ? hash(args[1]) : args[1];
      if (expected !== hash(stored)) return [{ affectedRows: 0 }];
      stored = args[0];
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected database operation: ${sql}`);
  },
};
globalThis.__auditPool = connection;
const mockDb = { name: 'isolated-db', setup(b) {
  b.onResolve({ filter: /^\.\/db$/ }, () => ({ path: 'db', namespace: 'isolated-db' }));
  b.onLoad({ filter: /.*/, namespace: 'isolated-db' }, () => ({ contents: 'export const getPool = () => globalThis.__auditPool;' }));
}};
async function bundle(entry, name, plugins = []) {
  const outfile = path.join(temporary, `${name}.cjs`);
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile, plugins });
  return require(outfile);
}

const previousFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => { throw new Error('Real networking is disabled in regression tests'); };
  const schema = await bundle('shared/app-data-validation.ts', 'schema');
  assert.equal(schema.validateAppData(seed), true, 'existing seed remains valid');
  for (const coordinates of [[], [[[[53,56],[54,56],[54,57]]]], [[[null]]]]) {
    const malformed = structuredClone(seed);
    malformed.festivalMap.siteOutline = { type: 'MultiPolygon', coordinates };
    assert.equal(schema.validateAppData(malformed), false, 'reject malformed site geometry before rendering');
  }
  assert.equal(schema.validateAppData(Object.fromEntries(['festival','stages','schedule','autographs','foodcourt','headliners'].map(k=>[k,null]))), false);
  const invalid = structuredClone(seed);
  invalid.schedule[0].headlinerId = 'missing-artist';
  assert.equal(schema.validateAppData(invalid), false);
  invalid.schedule = seed.schedule;
  invalid.festival.startDate = '2027-02-30';
  assert.equal(schema.validateAppData(invalid), false);
  invalid.festival = seed.festival;
  invalid.headliners.push(invalid.headliners[0]);
  assert.equal(schema.validateAppData(invalid), false);
  assert.equal(schema.validateMapCollection({type:'FeatureCollection',features:[{type:'Feature',properties:{id:'x',name:'X',category:'custom'},geometry:{type:'Point',coordinates:[181,50]}}]},'Point'), false);

  const badProfile = structuredClone(seed);
  badProfile.headliners[0].lastfm = { name: 'Artist', tags: 42, updatedAt: 'today' };
  assert.equal(schema.validateAppData(badProfile), false, 'reject malformed nested profile');

  const app = await bundle('cms/src/lib/app-data.ts', 'app-data', [mockDb]);
  const draft = await app.getAppData();
  const originalName = draft.festival.name;
  draft.festival.name = 'Unsaved draft';
  assert.equal((await app.getClientAppData()).festival.name, originalName, 'draft is isolated from public cache');
  failWrite = true;
  await assert.rejects(app.saveAppData(draft), /Simulated/);
  failWrite = false;
  assert.equal((await app.getAppData()).festival.name, originalName, 'failed write leaves raw cache intact');
  const a = await app.getAppData();
  const b = await app.getAppData();
  a.festival.name = 'First editor';
  b.festival.location = 'Second editor';
  await app.saveAppData(a);
  await assert.rejects(app.saveAppData(b), app.AppDataConflictError);
  assert.equal(JSON.parse(stored).festival.name, 'First editor');
  assert.equal(JSON.parse(stored).festival.location, seed.festival.location);
  const oldJson = stored;
  const next = JSON.parse(stored);
  next.festival.name = 'Maintenance update';
  await saveContentSnapshot(connection, oldJson, next);
  await assert.rejects(saveContentSnapshot(connection, oldJson, seed), /Content changed/);
  assert.equal((await app.getClientAppData()).festival.name, 'Maintenance update', 'external writes invalidate cache without timestamp resolution limits');
  assert.equal(JSON.parse(stored).revision, undefined, 'revision is transport metadata, not persisted JSON');

  const apiRoute = await bundle('cms/src/app/api/data/route.ts', 'data-route', [mockDb, {
    name: 'http-response', setup(builder) {
      builder.onResolve({ filter: /^next\/server$/ }, () => ({ path: 'response', namespace: 'http-response' }));
      builder.onLoad({ filter: /.*/, namespace: 'http-response' }, () => ({ contents: 'export const NextResponse = Response;' }));
    },
  }]);
  const response = await apiRoute.GET(new Request('https://app.example/api/data'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-cache', 'HTTP caches must revalidate catalog data');
  const etag = response.headers.get('etag');
  assert.equal(etag, `"${await app.getAppDataRevision()}"`);
  const unchanged = await apiRoute.GET(new Request('https://app.example/api/data', { headers: { 'If-None-Match': etag } }));
  assert.equal(unchanged.status, 304);
  assert.equal(await unchanged.text(), '', 'Unchanged catalogs do not transfer a JSON body');
  const changed = await app.getAppData();
  changed.festival.name = 'New content after admin save';
  await app.saveAppData(changed);
  const afterSave = await apiRoute.GET(new Request('https://app.example/api/data', { headers: { 'If-None-Match': etag } }));
  assert.equal(afterSave.status, 200, 'An admin save invalidates every previous ETag');
  assert.notEqual(afterSave.headers.get('etag'), etag);
  assert.equal((await afterSave.json()).festival.name, changed.festival.name);

  let storedToken = '';
  globalThis.__auditPool = { async query(sql, args) {
    if (sql.startsWith('DELETE FROM admin_sessions')) return [{}];
    if (sql.startsWith('INSERT INTO admin_sessions')) { storedToken = args[0]; return [{ affectedRows: 1 }]; }
    if (sql.includes('SELECT s.id, s.token')) return [args.includes(storedToken) ? [{ id: 1, token: storedToken }] : []];
    if (sql.startsWith('UPDATE admin_sessions')) { assert.equal(args[2], storedToken); storedToken = args[0]; return [{}]; }
    throw new Error(`Unexpected auth operation: ${sql}`);
  }};
  const auth = await bundle('cms/src/lib/auth.ts', 'auth', [mockDb]);
  const token = await auth.createAdminSession(1);
  assert.equal(storedToken, `sha256:${hash(token)}`);
  assert.equal(await auth.verifyBearerToken(`Bearer ${token}`), true);
  assert.equal(await auth.verifyBearerToken(`Bearer ${storedToken}`), false, 'stored hash cannot be replayed');
  assert.equal(await auth.verifyBearerToken(`Bearer ${hash(token)}`), false, 'digest without prefix cannot be replayed');
  storedToken = randomBytes(32).toString('hex');
  const legacyToken = storedToken;
  assert.equal(await auth.verifyBearerToken(`Bearer ${legacyToken}`), true);
  assert.equal(storedToken, `sha256:${hash(legacyToken)}`, 'legacy session is upgraded on valid use');
  globalThis.__auditPool = connection;

  const json = await bundle('cms/src/lib/request-json.ts', 'request-json');
  const request = (body) => new Request('http://test.local', { method: 'POST', body, duplex: 'half' });
  assert.deepEqual(await json.readRequestJson(request('{"ok":true}'), 32), { ok: true });
  await assert.rejects(json.readRequestJson(request('{'), 32), (error) => error.status === 400);
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(10)); },
    cancel() { cancelled = true; },
  });
  await assert.rejects(json.readRequestJson(request(stream), 16), (error) => error.status === 413);
  assert.equal(cancelled, true, 'oversized streamed body is cancelled without Content-Length');

  const endpoint = await bundle('cms/src/lib/push-endpoint.ts', 'push-endpoint');
  for (const url of ['https://127.0.0.1/push','https://[::1]/push','https://10.0.0.1/push','https://fcm.googleapis.com.evil.test/push','https://fcm.googleapis.com:9443/push','https://user@fcm.googleapis.com/push']) {
    assert.equal(endpoint.isAllowedPushEndpoint(url), false, url);
  }
  for (const url of ['https://fcm.googleapis.com/fcm/send/token','https://updates.push.services.mozilla.com/wpush/v2/token','https://web.push.apple.com/token','https://wns2-pn1p.notify.windows.com/w/?token']) {
    assert.equal(endpoint.isAllowedPushEndpoint(url), true, url);
  }
  const key = createECDH('prime256v1'); key.generateKeys();
  assert.equal(endpoint.isValidPushKey(key.getPublicKey().toString('base64url'), randomBytes(16).toString('base64url')), true);
  assert.equal(endpoint.isValidPushKey('A'.repeat(87),'B'.repeat(22)), false);

  const limiter = await bundle('cms/src/lib/rate-limit.ts', 'rate-limit');
  limiter.consumeRateLimit('test','key',2,1000,0);
  limiter.consumeRateLimit('test','key',2,1000,1);
  assert.throws(()=>limiter.consumeRateLimit('test','key',2,1000,2),limiter.RateLimitError);
  limiter.consumeRateLimit('test','key',2,1000,1000);
  const routeInput = await bundle('cms/src/lib/route-input.ts', 'route-input');
  for (const input of ['', 'fromLat=&fromLng=0&toLat=1&toLng=1', 'waypoints=91,0|0,0', 'waypoints=0,0', 'waypoints=NaN,0|0,0']) {
    assert.equal(routeInput.parseRouteInput(new URLSearchParams(input)),null,input);
  }
  assert.equal(routeInput.parseRouteInput(new URLSearchParams('waypoints=56,53|56.1,53.1')).waypoints,'56,53|56.1,53.1');

  const routing = await bundle('src/utils/map/externalRouting.ts', 'routing', [{ name: 'map-config', setup(b) {
    b.onResolve({ filter: /^react-native$/ }, () => ({ path: 'native', namespace:'map-config' }));
    b.onResolve({ filter: /config\/(?:yandexMaps|api)$/ }, () => ({ path: 'config', namespace:'map-config' }));
    b.onLoad({filter:/.*/,namespace:'map-config'},()=>({contents:'export const YANDEX_MAPS_API_KEY="test"; export const API_BASE_URL="https://app.example/api"; export const Platform={OS:"web"}; export const Linking={};'}));
  }}]);
  globalThis.fetch = async () => new Response(JSON.stringify({route:{legs:[
    {status:'OK',steps:[{length:100,duration:60,polyline:{points:[[56,53],[56.1,53.1]]}}]},
    {status:'OK',steps:[{length:200,duration:120,polyline:{points:[[56.1,53.1],[56.2,53.2]]}}]},
  ]}}));
  const route = await routing.fetchRoadRoute([{lat:56,lng:53},{lat:56.1,lng:53.1},{lat:56.2,lng:53.2}]);
  assert.equal(route.distanceMeters,300);
  assert.equal(route.durationSeconds,180);
  assert.equal(route.coordinates.length,3);
  console.log('Audit regressions: schema, cache isolation, failed/concurrent writes, maintenance CAS, hashed/legacy sessions, bounded JSON, push destinations/keys, rate limits and full route parsing OK');
} finally {
  globalThis.fetch = previousFetch;
  delete globalThis.__auditPool;
  const resolved = path.resolve(temporary);
  if (!resolved.startsWith(path.resolve(tmpdir()) + path.sep) || !path.basename(resolved).startsWith('uletay-regressions-')) throw new Error('Unexpected test output directory');
  await rm(resolved,{recursive:true,force:true});
}
