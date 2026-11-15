import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import path from 'node:path';

const root = path.resolve(process.env.DIST_DIR ?? 'dist');
const port = Number(process.env.PORT ?? 4174);
// Optional public CMS snapshot for checking the current map without a local CMS.
const previewData = process.env.PREVIEW_DATA_FILE
  ? readFileSync(path.resolve(process.env.PREVIEW_DATA_FILE)) : null;
if (previewData) JSON.parse(previewData.toString('utf8'));
const apiOrigin = process.env.PREVIEW_API_ORIGIN ? new URL(process.env.PREVIEW_API_ORIGIN) : null;
// Optional public media for a CMS snapshot. Never proxy API mutations or credentials.
const mediaOrigin = process.env.PREVIEW_MEDIA_ORIGIN ? new URL(process.env.PREVIEW_MEDIA_ORIGIN) : null;
if (mediaOrigin && (mediaOrigin.protocol !== 'https:' || mediaOrigin.username || mediaOrigin.password)) {
  throw new Error('PREVIEW_MEDIA_ORIGIN must be a public HTTPS origin without credentials.');
}
if (apiOrigin && (apiOrigin.protocol !== 'http:' || !['localhost','127.0.0.1','[::1]'].includes(apiOrigin.hostname))) {
  throw new Error('PREVIEW_API_ORIGIN must point to a local HTTP development server.');
}
const productionCsp = process.env.PREVIEW_PRODUCTION_CSP === '1'
  ? readFileSync(path.resolve('deploy/nginx.security-headers.conf'), 'utf8')
      .match(/add_header Content-Security-Policy "([^"]+)"/)?.[1]
      ?.replace(/;\s*upgrade-insecure-requests\b/, '')
  : undefined;

if (process.env.PREVIEW_PRODUCTION_CSP === '1' && !productionCsp) {
  throw new Error('Content-Security-Policy was not found in deploy/nginx.security-headers.conf');
}
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.pbf': 'application/x-protobuf',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
};

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', 'http://localhost');
  const pathname = decodeURIComponent(requestUrl.pathname);
  if (previewData && pathname === '/api/data') {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(previewData);
    return;
  }
  if (mediaOrigin && pathname.startsWith('/api/uploads/') && ['GET', 'HEAD'].includes(request.method)) {
    const upstream = httpsRequest(new URL(requestUrl.pathname, mediaOrigin.origin), { method: request.method }, result => {
      response.writeHead(result.statusCode ?? 502, {
        'Content-Type': result.headers['content-type'] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=300',
      });
      result.pipe(response);
    });
    upstream.setTimeout(10000, () => upstream.destroy(new Error('Media timeout')));
    upstream.on('error', () => {
      if (response.headersSent) response.destroy();
      else response.writeHead(502).end('Public preview media unavailable');
    });
    upstream.end();
    return;
  }
  if (/^\/(?:about|playlist|legal)(?:\/|\/index\.html)?$/.test(pathname)) {
    response.writeHead(301, { Location: `/${requestUrl.search}` }).end();
    return;
  }
  if (apiOrigin && pathname.startsWith('/api/')) {
    const upstream = httpRequest(new URL(request.url, apiOrigin), {
      method: request.method, headers: {...request.headers, host:apiOrigin.host},
    }, (result) => {
      response.writeHead(result.statusCode ?? 502, {...result.headers, 'cache-control':'no-store'});
      result.pipe(response);
    });
    upstream.on('error', () => response.writeHead(502).end('Local API unavailable'));
    request.pipe(upstream);
    return;
  }
  const discoveryFiles = ['/llms.txt', '/ai-guide.md', '/ai-catalog.json', '/.well-known/ai-catalog.json', '/webmcp.json'];
  if (discoveryFiles.includes(pathname) && !existsSync(path.join(root, pathname.slice(1)))) {
    response.writeHead(404).end('Not found');
    return;
  }
  let target = path.resolve(root, `.${pathname}`);
  if (!target.startsWith(root)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  if (existsSync(target) && statSync(target).isDirectory()) target = path.join(target, 'index.html');
  if (!existsSync(target)) target = path.join(root, 'index.html');
  const contentType = pathname.endsWith('/ai-catalog.json')
    ? 'application/ai-catalog+json; charset=utf-8'
    : pathname === '/api/data'
    ? 'application/json; charset=utf-8'
    : mime[path.extname(target)] ?? 'application/octet-stream';
  response.setHeader('Content-Type', contentType);
  response.setHeader('Cache-Control', 'no-cache');
  if (productionCsp) response.setHeader('Content-Security-Policy', productionCsp);
  const file = createReadStream(target);
  file.on('error', () => {
    if (response.headersSent) response.destroy();
    else response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '1' })
      .end('Local build is temporarily unavailable');
  });
  file.pipe(response);
});

server.listen({ port, host: '::', ipv6Only: false }, () => {
  console.log(`Local preview: http://localhost:${port}/${productionCsp ? ' (production CSP enabled)' : ''}`);
});
