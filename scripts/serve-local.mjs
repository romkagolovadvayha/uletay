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
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
};

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', 'http://localhost');
  let pathname;
  try { pathname = decodeURIComponent(requestUrl.pathname); }
  catch { response.writeHead(400).end('Invalid URL'); return; }
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
  if (pathname === '/index.html' || /^\/more\/?$/.test(pathname)) {
    response.writeHead(301, { Location: `/${requestUrl.search}` }).end();
    return;
  }
  if (/^\/headliners(?:\/|\/index\.html)?$/.test(pathname)) {
    const yearFile = path.join(root, 'festival-year.txt');
    const year = existsSync(yearFile) ? readFileSync(yearFile, 'utf8').trim() : '';
    if (/^\d{4}$/.test(year)) {
      response.writeHead(301, { Location: `/headliners/${year}${requestUrl.search}` }).end();
      return;
    }
  }
  if (/^\/(?:map|schedule|autographs|favorites|headliners|foodcourt|rules|settings|help|privacy|chat|wishes)(?:\/.*)?\/$/.test(pathname)) {
    response.writeHead(301, { Location: requestUrl.pathname.replace(/\/+$/, '') + requestUrl.search }).end();
    return;
  }
  if (apiOrigin && pathname.startsWith('/api/')) {
    const upstream = httpRequest(new URL(request.url, apiOrigin), {
      method: request.method, headers: {...request.headers, host:apiOrigin.host},
    }, (result) => {
      response.writeHead(result.statusCode ?? 502, {...result.headers, 'cache-control':'no-store'});
      result.pipe(response);
    });
    response.on('close',()=>upstream.destroy());
    upstream.on('error', () => {if(response.headersSent)response.destroy();else response.writeHead(502).end('Local API unavailable');});
    request.pipe(upstream);
    return;
  }
  const discoveryFiles = ['/llms.txt', '/ai-guide.md', '/ai-catalog.json', '/.well-known/ai-catalog.json', '/webmcp.json'];
  if (discoveryFiles.includes(pathname) && !existsSync(path.join(root, pathname.slice(1)))) {
    response.writeHead(404).end('Not found');
    return;
  }
  const candidates = [...new Set([requestUrl.pathname, pathname])].map(value => path.resolve(root, `.${value}`));
  if (candidates.some(target => target !== root && !target.startsWith(root + path.sep))) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  let target;
  let size;
  try {
    target = candidates.map(candidate => existsSync(candidate) && statSync(candidate).isDirectory() ? path.join(candidate, 'index.html') : candidate).find(candidate => existsSync(candidate) && statSync(candidate).isFile());
    if (!target) {
      const spaRoute = /^\/(?:map(?:\/[^/]+)?|schedule(?:\/(?:live\/[^/.]+|full(?:\/[^/]+)?))?|autographs(?:\/[^/.]+)?|favorites|headliners(?:\/[^/.]+)?|foodcourt(?:\/[^/.]+)?|rules|settings|help|chat|wishes)$/.test(pathname);
      if (spaRoute) target = path.join(root, 'index.html');
      else {
        response.statusCode = 404;
        response.setHeader('X-Robots-Tag', 'noindex, nofollow');
        target = path.join(root, '404.html');
        if (!existsSync(target)) { response.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}).end('Not found'); return; }
      }
    }
    size = statSync(target).size;
  } catch {
    response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '1' }).end('Local build is temporarily unavailable');
    return;
  }
  const contentType = pathname.endsWith('/ai-catalog.json')
    ? 'application/ai-catalog+json; charset=utf-8'
    : pathname === '/api/data'
    ? 'application/json; charset=utf-8'
    : mime[path.extname(target)] ?? 'application/octet-stream';
  response.setHeader('Content-Type', contentType);
  response.setHeader('Cache-Control', 'no-cache');
  if (productionCsp) response.setHeader('Content-Security-Policy', productionCsp);
  let streamOptions;
  if (contentType.startsWith('video/')) {
    response.setHeader('Accept-Ranges', 'bytes');
    if (request.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      let start = match?.[1] ? Number(match[1]) : 0;
      let end = match?.[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
      if (match && !match[1] && match[2]) { start = Math.max(0, size - Number(match[2])); end = size - 1; }
      if (!match || (!match[1] && !match[2]) || (!match[1] && Number(match[2]) <= 0) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
        response.writeHead(416, { 'Content-Range': `bytes */${size}`, 'Content-Length': '0' }).end();
        return;
      }
      response.statusCode = 206;
      response.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
      streamOptions = { start, end };
    }
  }
  response.setHeader('Content-Length', streamOptions ? streamOptions.end - streamOptions.start + 1 : size);
  if (request.method === 'HEAD') { response.end(); return; }
  const file = createReadStream(target, streamOptions);
  file.on('error', () => {
    if (response.headersSent) response.destroy();
    else {
      response.removeHeader('Content-Length');
      response.removeHeader('Content-Range');
      response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '1' })
        .end('Local build is temporarily unavailable');
    }
  });
  file.pipe(response);
});

server.listen({ port, host: '::', ipv6Only: false }, () => {
  console.log(`Local preview: http://localhost:${server.address().port}/${productionCsp ? ' (production CSP enabled)' : ''}`);
});
