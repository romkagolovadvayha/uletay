import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { createECDH, randomBytes } from 'node:crypto';
import { gzipSync, brotliCompressSync } from 'node:zlib';

const root = process.cwd();
const out = path.join(root, 'artifacts/project-audit-2026-09-09');
await fs.mkdir(out, { recursive: true });
const require = createRequire(import.meta.url);
const findings = [];
const seed = JSON.parse(await fs.readFile('cms/seed/content.json', 'utf8'));
let stored = JSON.stringify(seed);
let revision = 100;
const queries = [];
const connection = {
  async query(sql, args) {
    queries.push({ sql, args });
    if (sql.startsWith('SELECT UNIX_TIMESTAMP')) return [[{ updatedAt: revision }]];
    if (sql.startsWith('SELECT content')) return [[{ content: stored }]];
    if (sql.startsWith('UPDATE app_content')) { stored = args[0]; revision++; return [{ affectedRows: 1 }]; }
    return [{ affectedRows: 1 }];
  },
  async beginTransaction() {}, async commit() {}, async rollback() {}, release() {},
};
globalThis.__auditPool = { ...connection, async getConnection() { return connection; } };
const mockDb = {
  name: 'audit-db',
  setup(b) {
    b.onResolve({ filter: /^\.\/db$/ }, () => ({ path: 'db', namespace: 'audit' }));
    b.onLoad({ filter: /.*/, namespace: 'audit' }, () => ({ contents: 'export const getPool = () => globalThis.__auditPool;' }));
  },
};
async function bundle(entry, name, plugins = [], extra = {}) {
  const file = path.join(root, 'tmp', `audit-${name}.cjs`);
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: file, plugins, ...extra });
  return require(file);
}
const app = await bundle('cms/src/lib/app-data.ts', 'data', [mockDb]);
const malformed = Object.fromEntries(['festival', 'stages', 'schedule', 'autographs', 'foodcourt', 'headliners'].map(k => [k, null]));
assert.equal(app.validateAppData(malformed), true);
findings.push({ id: 'schema-validation', reproduced: true, detail: 'The validator accepts null for every required property.' });

const raw = await app.getAppData();
const clientPayload = Buffer.from(JSON.stringify(await app.getClientAppData()));
await fs.writeFile(path.join(out, 'client-payload-size.json'), JSON.stringify({
  source: 'getClientAppData() using local cms/seed/content.json and mocked database',
  bytes: clientPayload.length, gzip: gzipSync(clientPayload).length,
  brotli: brotliCompressSync(clientPayload).length,
}, null, 2));
const originalName = (await app.getClientAppData()).festival.name;
raw.festival.name = 'AUDIT UNSAVED CHANGE';
assert.equal((await app.getClientAppData()).festival.name, 'AUDIT UNSAVED CHANGE');
assert.equal(JSON.parse(stored).festival.name, originalName);
findings.push({ id: 'uncommitted-cache-mutation', reproduced: true, detail: 'Mutating getAppData().festival changes the public cached response before any database write.' });

app.invalidateAppDataCache();
const snapshotA = structuredClone(await app.getAppData());
const snapshotB = structuredClone(await app.getAppData());
snapshotA.festival.name = 'FIRST EDIT';
snapshotB.festival.location = 'SECOND EDIT';
await app.saveAppData(snapshotA);
await app.saveAppData(snapshotB);
assert.notEqual(JSON.parse(stored).festival.name, 'FIRST EDIT');
assert.equal(JSON.parse(stored).festival.location, 'SECOND EDIT');
findings.push({ id: 'lost-concurrent-edit', reproduced: true, detail: 'A later save from a stale snapshot overwrites the other editor\'s changes without conflict detection.' });

const push = await bundle('cms/src/lib/push.ts', 'push', [mockDb]);
const queryCount = queries.length;
const pushKey = createECDH('prime256v1');pushKey.generateKeys();
await push.registerWebPushSubscription({ endpoint: 'https://127.0.0.1:9443/audit-no-request', keys: { p256dh: pushKey.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } });
assert(queries.slice(queryCount).some(q => q.sql.includes('INSERT INTO push_subscriptions')));
findings.push({ id: 'unrestricted-push-endpoint', reproduced: true, detail: 'A loopback HTTPS endpoint passed validation and reached the mocked INSERT. No database connection or outbound HTTP request occurred.' });

const originalFetch = globalThis.fetch;
const routing = await bundle('src/utils/map/externalRouting.ts', 'routing', [{
  name: 'audit-maps', setup(b) {
    b.onResolve({ filter: /config\/yandexMaps$/ }, () => ({ path: 'maps', namespace: 'audit-maps' }));
    b.onLoad({ filter: /.*/, namespace: 'audit-maps' }, () => ({ contents: 'export const YANDEX_MAPS_API_KEY = "audit-key";' }));
    b.onResolve({ filter: /^react-native$/ }, () => ({ path: 'rn', namespace: 'audit-rn' }));
    b.onLoad({ filter: /.*/, namespace: 'audit-rn' }, () => ({ contents: 'export const Platform={OS:"web"}; export const Linking={};' }));
  },
}], { define: { 'process.env.EXPO_PUBLIC_API_URL': '""' } });
try {
  globalThis.fetch = async () => ({ ok: true, async json() { return { route: { legs: [
    { status: 'OK', steps: [{ length: 100, duration: 60, polyline: { points: [[56.60, 53.60], [56.61, 53.61]] } }] },
    { status: 'OK', steps: [{ length: 200, duration: 120, polyline: { points: [[56.61, 53.61], [56.62, 53.62]] } }] },
  ] } }; } });
  const result = await routing.fetchRoadRoute([{lat:56.60,lng:53.60},{lat:56.61,lng:53.61},{lat:56.62,lng:53.62}]);
  assert.equal(result.distanceMeters, 100);
  assert.equal(result.durationSeconds, 60);
  findings.push({ id: 'routing-first-leg-only', reproduced: true, actual: { distance: result.distanceMeters, duration: result.durationSeconds }, expected: { distance: 300, duration: 180 } });
} finally { globalThis.fetch = originalFetch; }

await fs.writeFile(path.join(out, 'core-reproductions.json'), JSON.stringify(findings, null, 2));
console.log(JSON.stringify(findings, null, 2));
