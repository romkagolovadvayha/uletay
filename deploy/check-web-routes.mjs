import http from 'node:http';
import https from 'node:https';
import { pathToFileURL } from 'node:url';

const fixedRoutes = [
  '/', '/map', '/schedule', '/schedule/full', '/autographs', '/favorites',
  '/playlist', '/foodcourt', '/about', '/rules', '/settings', '/legal', '/help',
];
const detailRoutes = [
  ['headliners', '/headliners/'], ['schedule', '/schedule/live/'],
  ['autographs', '/autographs/'], ['foodcourt', '/foodcourt/'],
  ['stages', '/schedule/full/'],
];

// Same portable ID format as src/seo/seoRouteUtils.ts; this checker also runs
// on the VPS, where the TypeScript source and dependencies are not deployed.
function routeId(id) {
  return encodeURIComponent(String(id).replaceAll('~', '~7E').replaceAll('/', '~2F').replaceAll('.', '~2E'));
}

export async function checkWebRoutes(origin, { connectHost } = {}) {
  const base = new URL(origin).origin;
  const failures = [];
  let requests = 0;
  const agents = { 'http:': new http.Agent({ keepAlive: true }), 'https:': new https.Agent({ keepAlive: true }) };
  function get(pathname) {
    requests++;
    const url = new URL(pathname, base);
    if (url.origin !== base) throw new Error(`Foreign route: ${url.href}`);
    return new Promise((resolve, reject) => {
      const request = (url.protocol === 'https:' ? https : http).get(url, {
        agent: agents[url.protocol],
        signal: AbortSignal.timeout(15_000),
        headers: { 'Accept': 'text/html,application/json', 'Cache-Control': 'no-cache' },
        ...(connectHost ? {
          autoSelectFamily: false,
          lookup: (_host, _options, callback) => callback(null, connectHost, 4),
        } : {}),
      }, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { body += chunk; });
        response.on('error', reject);
        response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
      });
      request.on('error', reject);
    });
  }
  function expectHtml(pathname, response) {
    if (response.status !== 200 || !response.headers['content-type']?.includes('text/html') || !/<html\b/i.test(response.body)) {
      failures.push(`${pathname}: expected HTML 200, got ${response.status}`);
    }
  }

  try {
    const [sitemap, api] = await Promise.all([get('/sitemap.xml'), get('/api/data')]);
    if (sitemap.status !== 200 || api.status !== 200) throw new Error('sitemap.xml or /api/data is unavailable');
    const sitemapUrls = [...sitemap.body.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => new URL(match[1].replaceAll('&amp;', '&')));
    if (!sitemapUrls.length) throw new Error('sitemap.xml has no routes');
    const data = JSON.parse(api.body);
    const routes = new Set(fixedRoutes);
    const festivalYear = data.festival?.year;
    if (!Number.isInteger(festivalYear)) throw new Error('/api/data has no festival year');
    routes.add(`/headliners/${festivalYear}`);
    for (const headliner of data.headliners ?? []) {
      for (const year of headliner.years ?? []) routes.add(`/headliners/${year}`);
    }
    for (const url of sitemapUrls) {
      if (url.origin !== base) throw new Error(`Foreign sitemap URL: ${url.href}`);
      routes.add(url.pathname);
    }
    for (const [key, prefix] of detailRoutes) {
      if (!Array.isArray(data[key])) throw new Error(`/api/data has no ${key} array`);
      for (const entity of data[key]) routes.add(prefix + routeId(entity.id));
    }
    for (const poi of data.mapPois?.features ?? []) routes.add('/map/' + routeId(poi.properties.id));

    // These deliberately have no prerendered file: CMS entries added after a
    // build must still reach the app on direct entry and browser refresh.
    for (const prefix of [...detailRoutes.map(([, prefix]) => prefix), '/map/']) {
      routes.add(prefix + routeId('__route-check-новая карточка/F.P.G.~__'));
    }
    let cursor = 0;
    const paths = [...routes];
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (cursor < paths.length) {
        const pathname = paths[cursor++];
        try {
          expectHtml(pathname, await get(pathname));
          // A second independent request also covers links with campaign/query parameters.
          expectHtml(pathname + '?route_check=refresh', await get(pathname + '?route_check=refresh'));
        } catch (error) {
          failures.push(`${pathname}: ${error.message}`);
        }
      }
    }));

    for (const prefix of [...detailRoutes.map(([, prefix]) => prefix), '/map/']) {
      const pathname = prefix + routeId('__route-check-новая карточка/F.P.G.~__');
      const response = await get(pathname + '/?route_check=slash');
      const target = new URL(response.headers.location ?? '/', base);
      if (![301, 308].includes(response.status) || target.href !== base + pathname + '?route_check=slash') {
        failures.push(`${pathname}/: redirect lost the encoded path or query`);
      }
    }
    for (const pathname of ['/__route-check-missing__', '/headliners/a/b', '/schedule/live', '/assets/__route-check-missing__.js', '/headliners/__route-check-missing__.js']) {
      const response = await get(pathname);
      if (response.status !== 404) failures.push(`${pathname}: expected 404, got ${response.status}`);
    }
    for (const pathname of ['/more', '/more/', '/index.html']) {
      const response = await get(pathname);
      if (response.status !== 301 || new URL(response.headers.location ?? '', base).href !== base + '/') {
        failures.push(`${pathname}: expected a redirect to /`);
      }
    }
    for (const pathname of ['/headliners', '/headliners/']) {
      const response = await get(pathname + '?route_check=redirect');
      if (response.status !== 301 || new URL(response.headers.location ?? '', base).href !== `${base}/headliners/${festivalYear}?route_check=redirect`) {
        failures.push(`${pathname}: expected a redirect to /headliners/${festivalYear}`);
      }
    }
    return { routes: routes.size, requests, failures };
  } finally {
    for (const agent of Object.values(agents)) agent.destroy();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const origin = process.argv[2];
    if (!origin) throw new Error('Usage: node deploy/check-web-routes.mjs https://uletayapp.ru [127.0.0.1]');
    const result = await checkWebRoutes(origin, { connectHost: process.argv[3] });
    console.log(`check-web-routes: ${result.routes} routes, ${result.requests} HTTP requests, ${result.failures.length} failures`);
    for (const failure of result.failures) console.error(failure);
    if (result.failures.length) process.exitCode = 1;
  } catch (error) {
    console.error(`check-web-routes: ${error.message}`);
    process.exitCode = 1;
  }
}
