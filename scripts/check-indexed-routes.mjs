import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, process.env.DIST_DIR ?? 'dist');
const current = readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');
const previousUrl = process.env.SEO_PREVIOUS_SITEMAP_URL ?? 'https://uletayapp.ru/sitemap.xml';
const previousResponse = await fetch(previousUrl, { signal: AbortSignal.timeout(15_000) });
if (!previousResponse.ok) {
  throw new Error(`Cannot compare indexed routes: ${previousUrl} returned ${previousResponse.status}`);
}

const urls = (xml) => [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) =>
  match[1].replaceAll('&amp;', '&'),
);
const oldUrls = urls(await previousResponse.text());
if (!oldUrls.length) throw new Error('Previous sitemap has no URLs');

const newUrls = new Set(urls(current));
const intentionalRedirects = new Set(['https://uletayapp.ru/headliners']);
const missing = oldUrls.filter((url) => !newUrls.has(url) && !intentionalRedirects.has(url));
if (missing.length) {
  throw new Error(`Indexed URLs would disappear from sitemap (${missing.length}):\n${missing.slice(0, 20).join('\n')}`);
}
console.log(`check-indexed-routes: preserved ${oldUrls.length - intentionalRedirects.size} existing sitemap URLs`);
