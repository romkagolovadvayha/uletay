import assert from 'node:assert/strict';

const origin = new URL(process.argv[2]);
assert.equal(origin.protocol, 'https:', 'Use the public HTTPS origin.');
assert.equal(origin.pathname, '/');
assert(!origin.username && !origin.password && !origin.search && !origin.hash);
const expectedRelease = process.argv[3];
let requests = 0;
async function get(pathname, mime) {
  const response = await fetch(new URL(pathname, origin), { signal: AbortSignal.timeout(15000) });
  requests++;
  assert.equal(response.status, 200, pathname);
  if (mime) assert(response.headers.get('content-type')?.startsWith(mime), `${pathname}: invalid MIME`);
  return response;
}
const health = await (await get('/api/health', 'application/json')).json();
assert.equal(health.ok, true);
if (expectedRelease) assert.equal(health.release, expectedRelease, 'A different release is serving traffic.');
const catalogText = await (await get('/ai-catalog.json', 'application/ai-catalog+json')).text();
assert.equal(await (await get('/.well-known/ai-catalog.json', 'application/ai-catalog+json')).text(), catalogText);
assert.equal(JSON.parse(catalogText).specVersion, '1.0');
const tools = await (await get('/webmcp.json', 'application/json')).json();
assert.equal(tools.tools.length, 6);
assert(tools.tools.every(tool => tool.annotations.readOnlyHint));
await (await get('/ai-guide.md', 'text/markdown')).text();
const llms = await (await get('/llms.txt', 'text/plain')).text();
for (const match of llms.matchAll(/\]\(([^)]+)\)/g)) {
  const link = new URL(match[1]);
  assert.equal(link.origin, origin.origin);
  await (await get(link.pathname)).arrayBuffer();
}
const robots = await (await get('/robots.txt', 'text/plain')).text();
assert.match(robots, /^Allow: \/api\/data\$$/m);
assert.match(robots, /^Disallow: \/admin/m);
const home = await (await get('/', 'text/html')).text();
assert.match(home, /rel="ai-catalog"/);
assert.match(home, /rel="describedby"/);
const login = await (await get('/admin/login', 'text/html')).text();
assert.match(login, /name="username"/);
assert.match(login, /name="password"/);
assert.match(login, /theme-toggle/);
const assets = new Set();
for (const html of [home, login]) {
  for (const match of html.matchAll(/(?:href|src)="([^"?#]+\.(?:css|js)(?:\?[^"#]*)?)"/g)) {
    const asset = new URL(match[1].replaceAll('&amp;', '&'), origin);
    if (asset.origin === origin.origin) assets.add(asset.pathname + asset.search);
  }
}
assert(assets.size > 0);
for (const asset of assets) await (await get(asset)).arrayBuffer();
console.log(`Public resources: ${requests} HTTP checks passed; health, release, discovery, login, styles and scripts (${origin.origin}).`);
