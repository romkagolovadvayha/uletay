import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const distDir = join(root, process.env.DIST_DIR ?? 'dist');
const indexPath = join(distDir, 'index.html');

const SITE_NAME = 'УЛЕТАЙ 2026';
const HOME_TITLE = `Официальное приложение фестиваля — ${SITE_NAME}`;
const DESCRIPTION =
  'Официальное приложение фестиваля УЛЕТАЙ в Лагуново, Удмуртия: расписание концертов, карта площадки, автограф-сессии, фудкорт и радио в эфире.';
const SITE_URL = (() => {
  const raw = process.env.EXPO_PUBLIC_SITE_URL ?? 'https://uletay.ru';
  try {
    const parsed = new URL(raw);
    if (parsed.hostname.startsWith('www.')) {
      parsed.hostname = parsed.hostname.slice(4);
    }
    return parsed.origin;
  } catch {
    return raw.replace(/\/$/, '');
  }
})();

function copyPublicFiles() {
  if (!existsSync(publicDir)) {
    return;
  }

  for (const entry of readdirSync(publicDir, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }

    copyFileSync(join(publicDir, entry.name), join(distDir, entry.name));
  }
}

function patchIndexHtml() {
  if (!existsSync(indexPath)) {
    console.warn('copy-public-static: dist/index.html not found, skipping head patch');
    return;
  }

  let html = readFileSync(indexPath, 'utf8');
  const seoBlock = `
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <meta name="description" content="${DESCRIPTION}" />
  <meta name="keywords" content="УЛЕТАЙ, фестиваль, Лагуново, Удмуртия, расписание, карта, концерты" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${SITE_URL}/" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:title" content="${HOME_TITLE}" />
  <meta property="og:description" content="${DESCRIPTION}" />
  <meta property="og:url" content="${SITE_URL}/" />
  <meta property="og:locale" content="ru_RU" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${HOME_TITLE}" />
  <meta name="twitter:description" content="${DESCRIPTION}" />`;

  if (!html.includes('name="description"')) {
    html = html.replace('</head>', `${seoBlock}\n</head>`);
  }

  if (!html.includes('<title>')) {
    html = html.replace('<head>', `<head>\n  <title>${HOME_TITLE}</title>`);
  } else {
    html = html.replace(/<title>.*?<\/title>/, `<title>${HOME_TITLE}</title>`);
  }

  if (!html.includes('lang=')) {
    html = html.replace('<html lang="en">', '<html lang="ru">');
    html = html.replace('<html>', '<html lang="ru">');
  }

  html = html.replace(
    /name="viewport" content="[^"]*"/,
    'name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"',
  );

  writeFileSync(indexPath, html, 'utf8');
}

function patchSitemap() {
  const sitemapPath = join(distDir, 'sitemap.xml');
  if (!existsSync(sitemapPath)) {
    return;
  }

  const siteUrl = SITE_URL.replace(/\/$/, '');
  const xml = readFileSync(sitemapPath, 'utf8').replaceAll('https://uletay.ru', siteUrl);
  writeFileSync(sitemapPath, xml, 'utf8');
}

function patchRobots() {
  const robotsPath = join(distDir, 'robots.txt');
  if (!existsSync(robotsPath)) {
    return;
  }

  const siteUrl = SITE_URL.replace(/\/$/, '');
  const robots = readFileSync(robotsPath, 'utf8').replaceAll('https://uletay.ru', siteUrl);
  writeFileSync(robotsPath, robots, 'utf8');
}

if (!existsSync(distDir)) {
  console.error('copy-public-static: dist/ does not exist — run expo export first');
  process.exit(1);
}

copyPublicFiles();
patchIndexHtml();
patchSitemap();
patchRobots();
console.log('copy-public-static: robots.txt, sitemap.xml and SEO head tags updated');
