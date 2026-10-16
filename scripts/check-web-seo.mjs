import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const distDir = path.join(projectRoot, process.env.DIST_DIR ?? 'dist');
const sitemapPath = path.join(distDir, 'sitemap.xml');
const robotsPath = path.join(distDir, 'robots.txt');
const festivalYearPath = path.join(distDir, 'festival-year.txt');

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
  if (/<(?:priority|changefreq)>/i.test(sitemap)) {
    fail('sitemap.xml contains unsupported priority/changefreq hints');
  }
  if (new Set(urls).size !== urls.length) {
    fail('sitemap.xml contains duplicate URLs');
  }
  const festivalYear = existsSync(festivalYearPath)
    ? readFileSync(festivalYearPath, 'utf8').trim()
    : '';
  if (!/^\d{4}$/.test(festivalYear)) {
    fail('dist/festival-year.txt is missing or invalid');
  } else if (!urls.includes(`https://uletayapp.ru/headliners/${festivalYear}`)) {
    fail(`sitemap.xml is missing the current headliners year ${festivalYear}`);
  }
  if (urls.includes('https://uletayapp.ru/headliners')) {
    fail('redirecting /headliners URL must not be in sitemap.xml');
  }

  for (const privateUrl of [
    'https://uletayapp.ru/favorites',
    'https://uletayapp.ru/settings',
    'https://uletayapp.ru/schedule/full',
  ]) {
    if (urls.includes(privateUrl)) {
      fail(`noindex URL is present in sitemap: ${privateUrl}`);
    }
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
    const viewport = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"/i)?.[1]?.trim();

    if (!title) fail(`${url} has no title`);
    if (!description) fail(`${url} has no meta description`);
    if (!html.includes('rel="describedby" type="text/plain"') || !html.includes('/llms.txt"')) {
      fail(`${url} has no llms.txt discovery link`);
    }
    if (!html.includes('rel="ai-catalog" type="application/ai-catalog+json"') || !html.includes('/.well-known/ai-catalog.json"')) {
      fail(`${url} has no AI Catalog discovery link`);
    }
    if (canonical !== url) fail(`${url} canonical mismatch: ${canonical ?? 'missing'}`);
    if (robots !== 'index, follow') fail(`${url} is not indexable: ${robots ?? 'missing'}`);
    if (!viewport || !/\bwidth\s*=\s*device-width\b/i.test(viewport)) {
      fail(`${url} has no mobile-friendly viewport: ${viewport ?? 'missing'}`);
    }
    if (viewport && !/\binitial-scale\s*=\s*1(?:\.0+)?\b/i.test(viewport)) {
      fail(`${url} has an invalid initial scale: ${viewport}`);
    }
    if (!html.includes('<html lang="ru">')) fail(`${url} does not declare lang="ru"`);
    const jsonLdMatches = [...html.matchAll(
      /<script\b[^>]*\bid=["']seo-jsonld["'][^>]*>([\s\S]*?)<\/script>/gi,
    )];
    if (jsonLdMatches.length !== 1) {
      fail(`${url} has ${jsonLdMatches.length} JSON-LD blocks with id=seo-jsonld`);
    } else {
      try {
        const structuredData = JSON.parse(jsonLdMatches[0][1]);
        const graph = Array.isArray(structuredData['@graph']) ? structuredData['@graph'] : [];
        const types = graph.map((node) => node?.['@type']).filter(Boolean);
        for (const requiredType of [
          'Organization',
          'WebSite',
          'WebPage',
          'BreadcrumbList',
          'Festival',
        ]) {
          if (!types.includes(requiredType)) {
            fail(`${url} JSON-LD has no ${requiredType} node`);
          }
        }
        if (types.includes('MusicFestival')) {
          fail(`${url} uses invalid MusicFestival type`);
        }
        const webpage = graph.find((node) => node?.['@type'] === 'WebPage');
        if (webpage?.url !== url) {
          fail(`${url} JSON-LD WebPage URL mismatch: ${webpage?.url ?? 'missing'}`);
        }
        for (const event of graph.filter((node) => ['Event', 'MusicEvent'].includes(node?.['@type']))) {
          if (!event.startDate || !event.endDate || event.endDate <= event.startDate) {
            fail(`${url} JSON-LD event has invalid start/end dates`);
          }
        }
      } catch (error) {
        fail(`${url} has invalid JSON-LD: ${error.message}`);
      }
    }
    if (!html.includes('id="seo-fallback"')) fail(`${url} has no static fallback content`);
    if (/seo-fallback[^}]*?(?:clip:rect|width:\s*1px|height:\s*1px)/i.test(html)) {
      fail(`${url} hides its static fallback content`);
    }

    const pathname = new URL(url).pathname;
    if (/^\/(?:schedule\/live|autographs|foodcourt|headliners)\/.*\.$/i.test(pathname)) {
      fail(`${url} has a Windows-unsafe trailing-dot route segment`);
    }

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

  for (const pathname of ['/favorites', '/settings', '/schedule/full']) {
    const url = new URL(pathname, 'https://uletayapp.ru').href;
    const file = routeFile(url);
    if (!existsSync(file)) {
      fail(`missing noindex route document for ${url}`);
      continue;
    }
    const html = readFileSync(file, 'utf8');
    const robots = html.match(/<meta\s+name="robots"\s+content="([^"]+)"/i)?.[1]?.trim();
    const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1]?.trim();
    if (robots !== 'noindex, nofollow') {
      fail(`${url} does not declare noindex, nofollow`);
    }
    if (canonical !== url) {
      fail(`${url} canonical mismatch: ${canonical ?? 'missing'}`);
    }
  }
}

if (!existsSync(robotsPath)) {
  fail('dist/robots.txt is missing');
} else {
  const robots = readFileSync(robotsPath, 'utf8');
  if (!/^User-agent:\s*\*/im.test(robots)) fail('robots.txt has no default user-agent');
  if (!/^Allow:\s*\/$/im.test(robots)) fail('robots.txt does not allow public crawling');
  if (!/^Allow:\s*\/api\/data\$$/m.test(robots)) fail('robots.txt does not allow the public catalog endpoint');
  if (!/^Sitemap:\s*https?:\/\/.+\/sitemap\.xml$/im.test(robots)) {
    fail('robots.txt has no absolute sitemap URL');
  }
  for (const privatePath of ['/admin', '/api/', '/_next/']) {
    if (!robots.includes(`Disallow: ${privatePath}`)) {
      fail(`robots.txt does not disallow ${privatePath}`);
    }
  }
}

for (const filename of ['llms.txt', 'ai-guide.md', 'ai-catalog.json', '.well-known/ai-catalog.json', 'webmcp.json']) {
  if (!existsSync(path.join(distDir, filename))) fail(`missing AI discovery file: ${filename}`);
}
try {
  const catalog = JSON.parse(readFileSync(path.join(distDir, 'ai-catalog.json'), 'utf8'));
  const wellKnown = JSON.parse(readFileSync(path.join(distDir, '.well-known/ai-catalog.json'), 'utf8'));
  if (JSON.stringify(catalog) !== JSON.stringify(wellKnown)) fail('AI Catalog copies differ');
  if (catalog.specVersion !== '1.0' || !Array.isArray(catalog.entries) || !catalog.entries.length) fail('invalid AI Catalog');
  const tools = JSON.parse(readFileSync(path.join(distDir, 'webmcp.json'), 'utf8')).tools;
  if (tools.length !== 6 || tools.some(tool => !tool.annotations.readOnlyHint)) fail('invalid WebMCP manifest');
} catch (error) { fail(`AI discovery JSON: ${error.message}`); }

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('check-web-seo: SEO artifacts are internally consistent');
