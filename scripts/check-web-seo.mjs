import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const distDir = path.join(projectRoot, process.env.DIST_DIR ?? 'dist');
const sitemapPath = path.join(distDir, 'sitemap.xml');
const robotsPath = path.join(distDir, 'robots.txt');

function fail(message) {
  console.error(`check-web-seo: ${message}`);
  process.exitCode = 1;
}

function routeFile(url) {
  const pathname = new URL(url).pathname;
  if (pathname === '/') {
    return path.join(distDir, 'index.html');
  }
  return path.join(distDir, ...pathname.slice(1).split('/'), 'index.html');
}

if (!existsSync(sitemapPath)) {
  fail('dist/sitemap.xml is missing');
} else {
  const sitemap = readFileSync(sitemapPath, 'utf8');
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) =>
    match[1].replaceAll('&amp;', '&'),
  );
  const titles = new Map();
  const canonicals = new Set();

  if (!urls.length) {
    fail('sitemap.xml contains no URLs');
  }

  for (const url of urls) {
    const file = routeFile(url);
    if (!existsSync(file)) {
      fail(`missing route document for ${url}: ${path.relative(projectRoot, file)}`);
      continue;
    }

    const html = readFileSync(file, 'utf8');
    const title = html.match(/<title>(.*?)<\/title>/i)?.[1]?.trim();
    const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1]?.trim();
    const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1]?.trim();
    const robots = html.match(/<meta\s+name="robots"\s+content="([^"]+)"/i)?.[1]?.trim();

    if (!title) fail(`${url} has no title`);
    if (!description) fail(`${url} has no meta description`);
    if (canonical !== url) fail(`${url} canonical mismatch: ${canonical ?? 'missing'}`);
    if (robots !== 'index, follow') fail(`${url} is not indexable: ${robots ?? 'missing'}`);
    if (!html.includes('<html lang="ru">')) fail(`${url} does not declare lang="ru"`);
    if (!html.includes('id="seo-jsonld"')) fail(`${url} has no JSON-LD`);
    if (!html.includes('id="seo-fallback"')) fail(`${url} has no static fallback content`);

    if (title) {
      const existing = titles.get(title);
      if (existing) {
        fail(`duplicate title for ${existing} and ${url}: ${title}`);
      }
      titles.set(title, url);
    }
    if (canonical) {
      if (canonicals.has(canonical)) {
        fail(`duplicate canonical URL: ${canonical}`);
      }
      canonicals.add(canonical);
    }
  }

  console.log(`check-web-seo: checked ${urls.length} sitemap URLs`);
}

if (!existsSync(robotsPath)) {
  fail('dist/robots.txt is missing');
} else {
  const robots = readFileSync(robotsPath, 'utf8');
  if (!/^User-agent:\s*\*/im.test(robots)) fail('robots.txt has no default user-agent');
  if (!/^Allow:\s*\/$/im.test(robots)) fail('robots.txt does not allow public crawling');
  if (!/^Sitemap:\s*https?:\/\/.+\/sitemap\.xml$/im.test(robots)) {
    fail('robots.txt has no absolute sitemap URL');
  }
  for (const privatePath of ['/admin', '/api/', '/_next/']) {
    if (!robots.includes(`Disallow: ${privatePath}`)) {
      fail(`robots.txt does not disallow ${privatePath}`);
    }
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('check-web-seo: SEO artifacts are internally consistent');
