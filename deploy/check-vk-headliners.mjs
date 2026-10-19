import assert from 'node:assert/strict';

const [origin, expectedRelease] = process.argv.slice(2);
assert(origin?.startsWith('https://'), 'Usage: node check-vk-headliners.mjs https://host [release]');
const response = await fetch(origin, { signal: AbortSignal.timeout(20000) });
assert.equal(response.status, 200, 'Showcase must return HTTP 200');
const html = await response.text();
assert(html.includes('data-vk-headliners="true"'), 'The showcase, not the main site, must be served');
assert(html.includes('data-vk-app-id="54834082"'), 'Showcase must use the dedicated VK Mini App');
if (expectedRelease) assert(html.includes(`data-release="${expectedRelease}"`), 'Showcase release does not match candidate');
const cards = [...html.matchAll(/data-artist-id="([^"]+)"/g)];
assert(cards.length <= 6, 'At most six artists may be displayed');
assert(html.includes('Все участники') && html.includes('Купить билет'), 'Both festival actions must be visible');
assert(html.includes('vh-countdown'), 'Festival countdown must be present');
assert(!response.headers.has('x-frame-options'), 'VK iframe must not be blocked');
const policy = response.headers.get('content-security-policy') || '';
assert(/frame-ancestors[^;]*https:\/\/vk\.com/.test(policy) && /frame-ancestors[^;]*https:\/\/vk\.ru/.test(policy), 'VK origins must be allowed');
assert(!/frame-ancestors[^;]*\s\*(?:\s|;)/.test(policy), 'Embedding must not allow arbitrary origins');
assert(response.headers.has('strict-transport-security'), 'HSTS must be enabled');
const assets = new Set([...html.matchAll(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/g)].map((m) => m[1].replaceAll('&amp;', '&')));
assert(assets.size > 0, 'Next assets must be present');
for (const asset of assets) {
  const result = await fetch(new URL(asset, origin), { method: 'HEAD', signal: AbortSignal.timeout(15000) });
  assert.equal(result.status, 200, `Missing asset: ${asset}`);
}
const redirect = await fetch(origin.replace('https:', 'http:'), { redirect: 'manual', signal: AbortSignal.timeout(10000) });
assert([301, 308].includes(redirect.status), 'HTTP must redirect to HTTPS');
assert.equal(new URL(redirect.headers.get('location')).origin, new URL(origin).origin);
for (const forbidden of ['/admin', '/api/auth', '/.env']) {
  const result = await fetch(new URL(forbidden, origin), { redirect: 'manual', signal: AbortSignal.timeout(10000) });
  assert.equal(result.status, 404, `Private route exposed: ${forbidden}`);
}
console.log(`VK headliners verified: ${cards.length} artists, ${assets.size} assets, HTTPS, VK framing, release ${expectedRelease || '(not checked)'}`);
