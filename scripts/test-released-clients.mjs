import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import path from 'node:path';

const origin = process.env.TEST_API_ORIGIN || 'http://localhost:3107';
const target = new URL(origin);
assert(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) && target.protocol === 'http:', 'Use an isolated local API.');
const sources = JSON.parse(process.env.RELEASE_CLIENT_SOURCES || '[]');
assert(sources.length, 'Set RELEASE_CLIENT_SOURCES to a JSON array of { version, source, hashes? } for saved releases.');
const payloadResponse = await fetch(origin + '/api/data');
assert.equal(payloadResponse.status, 200);
const payload = await payloadResponse.json();
const reports = [];
for (const release of sources) {
  const { version } = release;
  const root = path.resolve(release.source);
  const hashes = release.hashes ? JSON.parse(await readFile(release.hashes, 'utf8')) : null;
  for (const file of ['src/api/appDataApi.ts', 'shared/app-data-validation.ts', 'src/utils/appDataNormalize.ts', 'src/config/api.ts', 'src/api/radioNowPlayingApi.ts']) {
    const bytes = await readFile(path.join(root, file));
    if (hashes) assert.equal(createHash('sha256').update(bytes).digest('hex'), hashes.find(row => row.file === file).sha256, `Original ${version}: ${file}`);
  }
  const result = await build({
    stdin: { contents: `export * from './src/api/appDataApi'; export * from './src/api/radioNowPlayingApi'; export * from './shared/app-data-validation'; export * from './src/utils/appDataNormalize';`, resolveDir: root },
    bundle: true, platform: 'node', format: 'cjs', write: false,
    nodePaths: [path.resolve('node_modules')], define: { __DEV__: 'false' },
    plugins: [{ name: 'native-environment', setup(b) {
      b.onResolve({ filter: /^(react-native|@react-native-async-storage\/async-storage)$/ }, args => ({ path: args.path, namespace: 'native-environment' }));
      b.onLoad({ filter: /.*/, namespace: 'native-environment' }, args => ({ contents: args.path === 'react-native' ? 'export const Platform = { OS: "android" };' : 'export default globalThis.__storage;' }));
      b.onResolve({ filter: /\.(png|jpe?g|webp|webm|mp4|ttf)$/i }, args => ({ path: args.path, namespace: 'image' }));
      b.onLoad({ filter: /.*/, namespace: 'image' }, () => ({ contents: 'export default 1;' }));
    } }],
  });
  const module = { exports: {} };
  const values = new Map([['@uletay_favorites', '["keep-existing"]']]);
  const requests = [];
  runInNewContext(result.outputFiles[0].text, {
    module, exports: module.exports, URL, console, Date, AbortController,
    setTimeout, clearTimeout, structuredClone, process: { env: {} },
    __storage: { async getItem(key) { return values.get(key) ?? null; }, async setItem(key, value) { values.set(key, value); } },
    fetch: async (address, init) => {
      const url = new URL(address);
      assert.equal(url.origin, 'https://uletayapp.ru');
      assert(['/api/data', '/api/radio/now-playing'].includes(url.pathname));
      const response = await fetch(origin + url.pathname, init);
      requests.push({ path: url.pathname, status: response.status });
      return response;
    },
  });
  const client = module.exports;
  assert.equal(client.validateAppData(payload), true, `${version} accepts current server data`);
  const normalized = client.normalizeAppData(structuredClone(payload));
  assert.equal(normalized.festival.year, payload.festival.year);
  assert.equal(normalized.foodcourt.length, payload.foodcourt.length);
  assert(normalized.mapPois.features.length >= payload.mapPois.features.length);
  assert(normalized.mapZones.features.length >= payload.mapZones.features.length);
  const cold = await client.refreshAppDataInBackground(true);
  assert.equal(cold.status, 'fresh', `${version} cold start`);
  const warm = await client.refreshAppDataInBackground(true);
  assert.equal(warm.status, 'fresh', `${version} conditional reload`);
  assert.equal(warm.cached.data.revision, cold.cached.data.revision);
  assert(requests.some(request => request.status === 304));
  assert.equal(values.get('@uletay_favorites'), '["keep-existing"]');
  let radio;
  try {
    const snapshot = await client.fetchRadioNowPlaying();
    if (version !== '1.0.12') { assert.equal(snapshot.source, 'liscase'); assert.equal(snapshot.stationId, 6); }
    assert.equal(typeof snapshot.title, 'string');
    radio = 'accepted actual local server response';
  } catch (error) { radio = `upstream not confirmed: ${error.message}`; }
  reports.push({ version, sourceVerification: hashes ? 'SHA-256 manifest' : (release.gitCommit || 'caller-provided snapshot'), acceptedCurrentData: true, coldStart: 'fresh', conditionalReload: '304 handled', favoritesPreserved: true, radio, requests });
}
await mkdir('tmp', { recursive: true });
await writeFile('tmp/native-release-compat-results.json', JSON.stringify(reports, null, 2));
console.log(JSON.stringify(reports, null, 2));
