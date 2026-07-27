import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AppData,
  AutographSession,
  FoodCourtVendor,
  Headliner,
  SchedulePerformance,
  Stage,
} from '../src/types';
import { getCanonicalUrl, resolveSeoMeta, type NavState, type SeoMeta } from '../src/seo/routeSeo';
import {
  DEFAULT_SOCIAL_IMAGE_URL,
  SITE_NAME,
  SITE_URL,
} from '../src/seo/site';

type SeedData = Partial<AppData> & {
  festival: AppData['festival'];
  stages: Stage[];
  schedule: SchedulePerformance[];
  autographs: AutographSession[];
  foodcourt: FoodCourtVendor[];
};

type RouteSpec = {
  path: string;
  routeName: string;
  params?: Record<string, string>;
  heading?: string;
  details?: string[];
  links?: { href: string; label: string }[];
  structuredData?: Record<string, unknown>;
};

type GeneratedRoute = RouteSpec & {
  meta: SeoMeta;
  canonical: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const distDir = path.join(projectRoot, process.env.DIST_DIR ?? 'dist');
const seedPath = path.join(projectRoot, 'cms', 'seed', 'content.json');
const indexPath = path.join(distDir, 'index.html');

function htmlEscape(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function xmlEscape(value: string): string {
  return htmlEscape(value);
}

function plainText(value: unknown): string {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value: string, maxLength = 180): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).replace(/\s+\S*$/, '')}…`;
}

function encodedPathname(routePath: string): string {
  const normalized = routePath.startsWith('/') ? routePath : `/${routePath}`;
  return normalized
    .split('/')
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join('/');
}

function routeOutputPath(routePath: string): string {
  const encoded = encodedPathname(routePath);
  if (encoded === '/') {
    return indexPath;
  }
  return path.join(distDir, ...encoded.slice(1).split('/'), 'index.html');
}

function navState(routeName: string, params?: Record<string, string>): NavState {
  return {
    routes: [{ name: routeName, ...(params ? { params } : {}) }],
    index: 0,
  };
}

async function fallbackHeadliners(): Promise<Headliner[]> {
  const [{ buildHistoricalHeadliners, buildHeadlinerId, canonicalHeadlinerName }, { headliners2026 }] =
    await Promise.all([
      import('../cms/scripts/headliners-patch-utils.mjs'),
      import('../cms/scripts/headliners-2026-data.mjs'),
    ]);

  const byId = new Map<string, Headliner>(
    (buildHistoricalHeadliners() as Headliner[]).map((item) => [item.id, item]),
  );

  for (const rawName of headliners2026 as string[]) {
    const name = canonicalHeadlinerName(rawName) as string;
    const id = buildHeadlinerId(name) as string;
    const existing = byId.get(id);
    byId.set(id, {
      id,
      name,
      description: existing?.description || name,
      imageTint: existing?.imageTint || '#1A1A1A',
      years: [...new Set([...(existing?.years ?? []), 2026])].sort((a, b) => b - a),
      ...(existing?.imageUrl ? { imageUrl: existing.imageUrl } : {}),
      ...(existing?.lastfm ? { lastfm: existing.lastfm } : {}),
    });
  }

  return [...byId.values()];
}

async function loadBuildData(): Promise<AppData> {
  const seed = JSON.parse(readFileSync(seedPath, 'utf8')) as SeedData;
  const seedHeadliners = Array.isArray(seed.headliners) ? seed.headliners : [];
  const headliners = seedHeadliners.length ? seedHeadliners : await fallbackHeadliners();
  let data = { ...seed, headliners } as AppData;

  const apiBase = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (!apiBase || process.env.SEO_FETCH_LIVE_DATA === '0') {
    return data;
  }

  try {
    const response = await fetch(`${apiBase}/data`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const live = (await response.json()) as Partial<AppData>;
    data = {
      ...data,
      ...live,
      festival: { ...data.festival, ...live.festival },
      stages: live.stages?.length ? live.stages : data.stages,
      schedule: live.schedule?.length ? live.schedule : data.schedule,
      autographs: live.autographs?.length ? live.autographs : data.autographs,
      foodcourt: live.foodcourt?.length ? live.foodcourt : data.foodcourt,
      headliners: live.headliners?.length ? live.headliners : data.headliners,
    };
    console.log(`generate-web-seo: using live content from ${apiBase}/data`);
  } catch (error) {
    console.warn(
      `generate-web-seo: live content unavailable (${error instanceof Error ? error.message : error}); using repository data`,
    );
  }

  return data;
}

function isoFestivalDateTime(date: string, time: string): string {
  return `${date}T${time}:00+04:00`;
}

function stageName(stages: Stage[], stageId: string): string {
  return stages.find((stage) => stage.id === stageId)?.name ?? 'Сцена фестиваля';
}

function makeRouteSpecs(data: AppData): RouteSpec[] {
  const common: RouteSpec[] = [
    { path: '/', routeName: 'HomeTab', heading: `${data.festival.name} ${data.festival.year}` },
    { path: '/map', routeName: 'MapTab' },
    { path: '/schedule', routeName: 'ScheduleMain' },
    { path: '/schedule/full', routeName: 'FullSchedule' },
    { path: '/autographs', routeName: 'AutographsMain' },
    { path: '/favorites', routeName: 'FavoritesTab' },
    { path: '/playlist', routeName: 'PlaylistTab' },
    { path: '/headliners', routeName: 'HeadlinersMain' },
    { path: '/foodcourt', routeName: 'FoodCourtMain' },
    { path: '/about', routeName: 'FestivalAbout' },
    { path: '/rules', routeName: 'FestivalRules' },
    { path: '/legal', routeName: 'Legal' },
    { path: '/settings', routeName: 'Settings' },
  ];

  const stageRoutes: RouteSpec[] = data.stages.map((stage) => ({
    path: `/schedule/full/${stage.id}`,
    routeName: 'FullSchedule',
    params: { stageId: stage.id },
    heading: stage.name,
    details: [`Расписание выступлений на сцене «${stage.name}».`],
  }));

  const performanceRoutes: RouteSpec[] = data.schedule.map((performance) => ({
    path: `/schedule/live/${performance.id}`,
    routeName: 'LiveDetail',
    params: { performanceId: performance.id },
    heading: performance.artist,
    details: [
      `${performance.date}, ${performance.startTime}–${performance.endTime}`,
      stageName(data.stages, performance.stageId),
    ],
    structuredData: {
      '@type': 'MusicEvent',
      name: `${performance.artist} на фестивале ${data.festival.name}`,
      startDate: isoFestivalDateTime(performance.date, performance.startTime),
      endDate: isoFestivalDateTime(performance.date, performance.endTime),
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      location: {
        '@type': 'Place',
        name: stageName(data.stages, performance.stageId),
        address: data.festival.location,
      },
      performer: { '@type': 'MusicGroup', name: performance.artist },
    },
  }));

  const autographRoutes: RouteSpec[] = data.autographs.map((session) => ({
    path: `/autographs/${session.id}`,
    routeName: 'AutographDetail',
    params: { sessionId: session.id },
    heading: session.artist,
    details: [
      `${session.date}, ${session.startTime}–${session.endTime}`,
      session.location,
    ],
    structuredData: {
      '@type': 'Event',
      name: `Автограф-сессия: ${session.artist}`,
      startDate: isoFestivalDateTime(session.date, session.startTime),
      endDate: isoFestivalDateTime(session.date, session.endTime),
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      location: {
        '@type': 'Place',
        name: session.location,
        address: data.festival.location,
      },
      performer: { '@type': 'MusicGroup', name: session.artist },
    },
  }));

  const foodcourtRoutes: RouteSpec[] = data.foodcourt.map((vendor) => ({
    path: `/foodcourt/${vendor.id}`,
    routeName: 'FoodCourtDetail',
    params: { vendorId: vendor.id },
    heading: vendor.name,
    details: [vendor.description, vendor.hours, vendor.priceRange || vendor.priceFrom].filter(Boolean),
    structuredData: {
      '@type': 'FoodEstablishment',
      name: vendor.name,
      description: vendor.description,
      address: data.festival.location,
      priceRange: vendor.priceRange || vendor.priceFrom,
    },
  }));

  const headlinerRoutes: RouteSpec[] = data.headliners.map((headliner) => ({
    path: `/headliners/${headliner.id}`,
    routeName: 'HeadlinerDetail',
    params: { headlinerId: headliner.id },
    heading: headliner.name,
    details: [
      headliner.description,
      headliner.years?.length
        ? `Участие в фестивале: ${[...headliner.years].sort((a, b) => b - a).join(', ')}`
        : '',
    ].filter(Boolean),
    structuredData: {
      '@type': 'MusicGroup',
      name: headliner.name,
      description: plainText(headliner.description),
    },
  }));

  const scheduleLinks = performanceRoutes.map((route) => ({
    href: route.path,
    label: `${route.heading} — ${route.details?.[0] ?? ''}`,
  }));
  const autographLinks = autographRoutes.map((route) => ({
    href: route.path,
    label: `${route.heading} — ${route.details?.[0] ?? ''}`,
  }));
  const foodcourtLinks = foodcourtRoutes.map((route) => ({
    href: route.path,
    label: route.heading ?? route.path,
  }));
  const headlinerLinks = headlinerRoutes.map((route) => ({
    href: route.path,
    label: route.heading ?? route.path,
  }));

  const enrichedCommon = common.map((route) => {
    switch (route.path) {
      case '/schedule':
        return { ...route, links: scheduleLinks };
      case '/schedule/full':
        return {
          ...route,
          links: stageRoutes.map((item) => ({
            href: item.path,
            label: item.heading ?? item.path,
          })),
        };
      case '/autographs':
        return { ...route, links: autographLinks };
      case '/foodcourt':
        return { ...route, links: foodcourtLinks };
      case '/headliners':
        return { ...route, links: headlinerLinks };
      default:
        return route;
    }
  });

  return [
    ...enrichedCommon,
    ...stageRoutes,
    ...performanceRoutes,
    ...autographRoutes,
    ...foodcourtRoutes,
    ...headlinerRoutes,
  ];
}

function setTitle(html: string, title: string): string {
  const tag = `<title>${htmlEscape(title)}</title>`;
  return /<title>[\s\S]*?<\/title>/i.test(html)
    ? html.replace(/<title>[\s\S]*?<\/title>/i, tag)
    : html.replace('</head>', `  ${tag}\n</head>`);
}

function setMeta(
  html: string,
  attribute: 'name' | 'property',
  key: string,
  content: string,
): string {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(
    `<meta\\s+[^>]*${attribute}=["']${escapedKey}["'][^>]*>`,
    'i',
  );
  const tag = `<meta ${attribute}="${htmlEscape(key)}" content="${htmlEscape(content)}" />`;
  return expression.test(html)
    ? html.replace(expression, tag)
    : html.replace('</head>', `  ${tag}\n</head>`);
}

function setLink(html: string, rel: string, href: string, hreflang?: string): string {
  const hreflangSelector = hreflang
    ? `(?=[^>]*hreflang=["']${hreflang.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'])`
    : '';
  const expression = new RegExp(
    `<link\\s+${hreflangSelector}[^>]*rel=["']${rel}["'][^>]*>`,
    'i',
  );
  const tag = `<link rel="${htmlEscape(rel)}"${hreflang ? ` hreflang="${htmlEscape(hreflang)}"` : ''} href="${htmlEscape(href)}" />`;
  return expression.test(html)
    ? html.replace(expression, tag)
    : html.replace('</head>', `  ${tag}\n</head>`);
}

const primaryNavigation = [
  { href: '/', label: 'Главная' },
  { href: '/schedule', label: 'Расписание' },
  { href: '/headliners', label: 'Хэдлайнеры' },
  { href: '/map', label: 'Карта' },
  { href: '/autographs', label: 'Автографы' },
  { href: '/foodcourt', label: 'Фудкорт' },
  { href: '/about', label: 'О фестивале' },
];

function fallbackMarkup(route: GeneratedRoute): string {
  const details = route.details?.filter(Boolean) ?? [];
  const links = route.links ?? [];
  const heading = plainText(route.heading || route.meta.title.replace(` — ${SITE_NAME}`, ''));
  const nav = primaryNavigation
    .map((item) => `<a href="${htmlEscape(encodedPathname(item.href))}">${htmlEscape(item.label)}</a>`)
    .join(' · ');
  const detailMarkup = details.length
    ? `<ul>${details.map((item) => `<li>${htmlEscape(plainText(item))}</li>`).join('')}</ul>`
    : '';
  const linksMarkup = links.length
    ? `<section><h2>Страницы раздела</h2><ul>${links
        .map(
          (item) =>
            `<li><a href="${htmlEscape(encodedPathname(item.href))}">${htmlEscape(item.label)}</a></li>`,
        )
        .join('')}</ul></section>`
    : '';

  return `<main id="seo-fallback">
      <article>
        <h1>${htmlEscape(heading)}</h1>
        <p>${htmlEscape(route.meta.description)}</p>
        ${detailMarkup}
        ${linksMarkup}
        <nav aria-label="Основные разделы">${nav}</nav>
      </article>
    </main>`;
}

function structuredData(route: GeneratedRoute, data: AppData): Record<string, unknown> {
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL.replace(/\/$/, '')}/#website`,
      url: `${SITE_URL.replace(/\/$/, '')}/`,
      name: SITE_NAME,
      inLanguage: 'ru-RU',
    },
    {
      '@type': 'WebPage',
      '@id': `${route.canonical}#webpage`,
      url: route.canonical,
      name: route.meta.title,
      description: route.meta.description,
      inLanguage: 'ru-RU',
      isPartOf: { '@id': `${SITE_URL.replace(/\/$/, '')}/#website` },
    },
  ];

  if (route.path === '/') {
    graph.push({
      '@type': 'MusicFestival',
      name: `${data.festival.name} ${data.festival.year}`,
      startDate: data.festival.startDate,
      endDate: data.festival.endDate,
      location: {
        '@type': 'Place',
        name: data.festival.locationShort || data.festival.location,
        address: data.festival.location,
      },
      url: route.canonical,
    });
  }

  if (route.structuredData) {
    graph.push({
      ...route.structuredData,
      url: route.canonical,
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

function renderRouteHtml(template: string, route: GeneratedRoute, data: AppData): string {
  let html = template.replace(/<html(?:\s+lang=["'][^"']*["'])?>/i, '<html lang="ru">');
  html = setTitle(html, route.meta.title);
  html = setMeta(html, 'name', 'description', truncate(plainText(route.meta.description), 180));
  html = setMeta(html, 'name', 'robots', route.meta.noIndex ? 'noindex, nofollow' : 'index, follow');
  html = setMeta(html, 'property', 'og:type', 'website');
  html = setMeta(html, 'property', 'og:site_name', SITE_NAME);
  html = setMeta(html, 'property', 'og:title', route.meta.title);
  html = setMeta(html, 'property', 'og:description', truncate(plainText(route.meta.description), 200));
  html = setMeta(html, 'property', 'og:url', route.canonical);
  html = setMeta(html, 'property', 'og:locale', 'ru_RU');
  html = setMeta(html, 'property', 'og:image', DEFAULT_SOCIAL_IMAGE_URL);
  html = setMeta(html, 'property', 'og:image:width', '1024');
  html = setMeta(html, 'property', 'og:image:height', '576');
  html = setMeta(html, 'property', 'og:image:alt', `${SITE_NAME} — фестиваль в Удмуртии`);
  html = setMeta(html, 'name', 'twitter:card', 'summary_large_image');
  html = setMeta(html, 'name', 'twitter:title', route.meta.title);
  html = setMeta(html, 'name', 'twitter:description', truncate(plainText(route.meta.description), 200));
  html = setMeta(html, 'name', 'twitter:image', DEFAULT_SOCIAL_IMAGE_URL);
  html = setLink(html, 'canonical', route.canonical);
  html = setLink(html, 'alternate', route.canonical, 'ru');
  html = setLink(html, 'alternate', route.canonical, 'x-default');

  const jsonLd = JSON.stringify(structuredData(route, data)).replaceAll('<', '\\u003c');
  // Keep crawlable HTML in #root, but hide it visually so users don't see a text dump
  // before the Expo app boots (black shell matches the app background).
  const bootStyle = [
    'html,body,#root{background:#000;margin:0;min-height:100%}',
    '#seo-fallback{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}',
  ].join('');
  html = html.replace(
    '</head>',
    `  <script id="seo-jsonld" type="application/ld+json">${jsonLd}</script>\n  <style id="seo-fallback-style">${bootStyle}</style>\n</head>`,
  );
  html = html.replace(
    /<div\s+id=["']root["']\s*><\/div>/i,
    `<div id="root">${fallbackMarkup(route)}</div>`,
  );
  return html;
}

function sitemapXml(routes: GeneratedRoute[]): string {
  const entries = routes
    .filter((route) => !route.meta.noIndex)
    .map((route) => `  <url>\n    <loc>${xmlEscape(route.canonical)}</loc>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

async function main() {
  if (!existsSync(indexPath)) {
    throw new Error(`Missing ${indexPath}; run Expo web export first`);
  }

  const data = await loadBuildData();
  const specs = makeRouteSpecs(data);
  const byPath = new Map<string, GeneratedRoute>();

  for (const spec of specs) {
    const meta = resolveSeoMeta(navState(spec.routeName, spec.params), data);
    const canonical = getCanonicalUrl(spec.path);
    byPath.set(spec.path, {
      ...spec,
      meta: {
        ...meta,
        path: spec.path,
        description: truncate(plainText(meta.description), 180),
      },
      canonical,
    });
  }

  const routes = [...byPath.values()];
  const template = readFileSync(indexPath, 'utf8');
  for (const route of routes) {
    const outputPath = routeOutputPath(route.path);
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, renderRouteHtml(template, route, data), 'utf8');
  }

  writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml(routes), 'utf8');
  console.log(
    `generate-web-seo: wrote ${routes.length} indexable route documents and sitemap.xml`,
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
