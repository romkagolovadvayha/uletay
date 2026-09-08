import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import path from 'node:path';

const root = path.resolve(process.env.DIST_DIR ?? 'dist');
const port = Number(process.env.PORT ?? 4174);
const apiOrigin = process.env.PREVIEW_API_ORIGIN ? new URL(process.env.PREVIEW_API_ORIGIN) : null;
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
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
};

const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
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
  let target = path.resolve(root, `.${pathname}`);
  if (!target.startsWith(root)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  if (existsSync(target) && statSync(target).isDirectory()) target = path.join(target, 'index.html');
  if (!existsSync(target)) target = path.join(root, 'index.html');
  const contentType = pathname === '/api/data'
    ? 'application/json; charset=utf-8'
    : mime[path.extname(target)] ?? 'application/octet-stream';
  response.setHeader('Content-Type', contentType);
  response.setHeader('Cache-Control', 'no-cache');
  if (productionCsp) response.setHeader('Content-Security-Policy', productionCsp);
  createReadStream(target).pipe(response);
});

server.listen({ port, host: '::', ipv6Only: false }, () => {
  console.log(`Local preview: http://localhost:${port}/${productionCsp ? ' (production CSP enabled)' : ''}`);
});
