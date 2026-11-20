import { existsSync, readFileSync } from 'node:fs';
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
const intentionalRedirects = new Set(['https://uletayapp.ru/headliners', 'https://uletayapp.ru/about', 'https://uletayapp.ru/playlist', 'https://uletayapp.ru/legal']);
let consolidated=0;
const missing = oldUrls.filter((url) => {
  if(newUrls.has(url)||intentionalRedirects.has(url))return false;
  const file=path.join(distDir,new URL(url).pathname,'index.html');
  if(existsSync(file)){
    const canonical=readFileSync(file,'utf8').match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1]?.replaceAll('&amp;','&');
    if(canonical&&canonical!==url&&newUrls.has(canonical)){consolidated++;return false;}
  }
  return true;
});
if (missing.length) {
  throw new Error(`Indexed URLs would disappear from sitemap (${missing.length}):\n${missing.slice(0, 20).join('\n')}`);
}
console.log(`check-indexed-routes: preserved ${oldUrls.filter(url => !intentionalRedirects.has(url)).length} existing public URLs (${consolidated} consolidated with a canonical page)`);
