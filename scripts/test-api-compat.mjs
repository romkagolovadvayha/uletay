import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

const baselinePath = new URL('../tests/compat/app-data-validation-1.0.15.ts.txt', import.meta.url);
const baseline = await readFile(baselinePath, 'utf8');
assert.equal(createHash('sha256').update(baseline.replaceAll('\r\n', '\n')).digest('hex'),
  '73eb71320fc7d2cc89345ccf84868dac81fc7439fdba1a9babe61abdbdee8f4a', 'The frozen release contract must not be edited.');
const compiled = await build({ stdin: { contents: baseline, loader: 'ts' }, format: 'cjs', platform: 'node', write: false });
const module = { exports: {} };
runInNewContext(compiled.outputFiles[0].text, { module, exports: module.exports });
const acceptsLegacyData = module.exports.validateAppData;
const seed = JSON.parse(await readFile(new URL('../cms/seed/content.json', import.meta.url), 'utf8'));
assert.equal(acceptsLegacyData(seed), true, 'The repository catalog must remain valid for released clients.');
assert.equal(acceptsLegacyData({ ...seed, futureOptionalField: { enabled: true } }), true);
for (const key of ['festival', 'stages', 'headliners', 'schedule', 'autographs', 'foodcourt', 'rules']) {
  const broken = structuredClone(seed);
  delete broken[key];
  assert.equal(acceptsLegacyData(broken), false, `Old clients require ${key}`);
}

const origin = process.env.TEST_API_ORIGIN;
if (origin) {
  const target = new URL(origin);
  assert(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) && target.protocol === 'http:', 'Use a local test API.');
  const request = (pathname, options = {}) => fetch(new URL(pathname, origin), { ...options, signal: AbortSignal.timeout(15000) });
  const response = await request('/api/data', { headers: { Accept: 'application/json', 'User-Agent': 'Uletay-legacy-client-compat-test' } });
  assert.equal(response.status, 200, 'Old clients receive the full catalog without login or version headers.');
  assert.match(response.headers.get('content-type'), /application\/json/);
  const data = await response.json();
  assert.equal(acceptsLegacyData(data), true, 'The new server response is accepted by the released validator.');
  const etag = response.headers.get('etag');
  assert.equal(etag?.replace(/^W\//, ''), `"${data.revision}"`);
  for (const validator of [etag, `"${data.revision}"`, `W/"${data.revision}"`, `"older-revision", ${etag}`]) {
    const conditional = await request('/api/data', { headers: { 'If-None-Match': validator } });
    assert.equal(conditional.status, 304, validator);
    assert.equal(await conditional.text(), '');
  }
  const unknownRevision = await request('/api/data', { headers: { 'If-None-Match': '"' + '0'.repeat(64) + '"' } });
  assert.equal(unknownRevision.status, 200);
  const preflight = await request('/api/data', { method: 'OPTIONS' });
  assert.equal(preflight.status, 204);
  const pushConfig = await request('/api/push/subscribe');
  assert.equal(pushConfig.status, 200);
  assert.equal(typeof (await pushConfig.json()).webPushSupported, 'boolean');

  const images = new Set();
  function image(value) {
    if (typeof value !== 'string' || !value) return;
    const parsed = new URL(value, 'https://uletayapp.ru');
    if (parsed.origin === 'https://uletayapp.ru' && /^\/api\/(uploads|fest-assets)\//.test(parsed.pathname)) images.add(parsed.pathname);
  }
  function collect(value) {
    if (Array.isArray(value)) { value.forEach(collect); return; }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (/^(imageUrl|heroImageUrl|logoImageUrl)$/.test(key)) image(child);
      else if (key === 'menuImageUrls' && Array.isArray(child)) child.forEach(image);
      else collect(child);
    }
  }
  collect(data);
  const pending = [...images];
  const missing = [];
  const existingMissing = [];
  const mediaBaseline = process.env.TEST_MEDIA_BASELINE_ORIGIN;
  if (mediaBaseline) assert.equal(new URL(mediaBaseline).origin, 'https://uletayapp.ru', 'Only compare with the official public image baseline.');
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (pending.length) {
      const pathname = pending.pop();
      const media = await request(pathname);
      if (media.status !== 200) {
        await media.arrayBuffer();
        if (media.status === 404 && mediaBaseline) {
          const previous = await fetch(new URL(pathname, mediaBaseline), { signal: AbortSignal.timeout(15000) });
          const status = previous.status;
          await previous.arrayBuffer();
          if (status === 404) { existingMissing.push(pathname); continue; }
        }
        missing.push({ path: pathname, status: media.status });
        continue;
      }
      assert.match(media.headers.get('content-type'), /^image\//);
      assert((await media.arrayBuffer()).byteLength > 0);
    }
  }));
  assert.equal(missing.length, 0, `Image regressions (${missing.length}): ${JSON.stringify(missing.slice(0,5))}`);
  console.log(`Native API compatibility: HTTP 200/304, anonymous GET, OPTIONS, push configuration and ${images.size - existingMissing.length} images passed; ${existingMissing.length} confirmed pre-existing 404s, no new image failures.`);
  for (const pathname of existingMissing) console.log(`Already missing on production: ${decodeURI(pathname)}`);
} else {
  console.log('Native API compatibility: repository data accepted by the frozen released validator. Set TEST_API_ORIGIN for HTTP/media checks.');
}
console.log(`Legacy validator SHA-256 (LF): ${createHash('sha256').update(baseline.replaceAll('\r\n', '\n')).digest('hex')}`);
