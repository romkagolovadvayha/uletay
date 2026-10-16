import assert from 'node:assert/strict';

const origin = process.env.TEST_WEB_ORIGIN ?? 'http://localhost:4176';
const target = new URL(origin);
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) || target.protocol !== 'http:') {
  throw new Error('TEST_WEB_ORIGIN must point to a local HTTP preview.');
}
async function get(pathname, contentType) {
  const response = await fetch(new URL(pathname, origin), { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, pathname);
  assert(response.headers.get('content-type')?.startsWith(contentType), `${pathname}: ${response.headers.get('content-type')}`);
  const text = await response.text();
  assert(!/^\s*<!doctype/i.test(text) || contentType === 'text/html', `${pathname} fell back to HTML`);
  return text;
}
const catalogText = await get('/ai-catalog.json', 'application/ai-catalog+json');
assert.equal(await get('/.well-known/ai-catalog.json', 'application/ai-catalog+json'), catalogText);
const catalog = JSON.parse(catalogText);
assert.equal(catalog.specVersion, '1.0');
const manifest = JSON.parse(await get('/webmcp.json', 'application/json'));
assert.equal(manifest.tools.length, 6);
await get('/ai-guide.md', 'text/markdown');
const llms = await get('/llms.txt', 'text/plain');
const links = [...llms.matchAll(/\]\(([^)]+)\)/g)].map(match => new URL(match[1]));
for (const link of links) {
  const response = await fetch(new URL(link.pathname, origin), { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, 200, link.pathname);
}
const data = JSON.parse(await get('/api/data', 'application/json'));
assert(data.festival && Array.isArray(data.headliners));
for (const pathname of ['/', '/map', `/headliners/${data.festival.year}`]) {
  const html = await get(pathname, 'text/html');
  assert.match(html, /rel="ai-catalog" type="application\/ai-catalog\+json"/);
  assert.match(html, /rel="describedby" type="text\/plain"/);
}
const robots = await get('/robots.txt', 'text/plain');
assert.match(robots, /^Allow: \/api\/data\$$/m);
assert.match(robots, /^Disallow: \/admin/m);
console.log(`AI HTTP: ${links.length} links, catalog copies, MIME, JSON, HTML discovery, robots and local API passed (${origin}).`);
