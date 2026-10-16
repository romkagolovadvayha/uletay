import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkWebRoutes } from '../deploy/check-web-routes.mjs';

const nginx = process.env.NGINX_BIN ?? 'nginx';
const temporary = await mkdtemp(path.join(tmpdir(), 'uletay-web-routes-'));
const nginxPath = (value) => value.replaceAll('\\', '/');
let processHandle;
try {
  // A root-started nginx drops worker privileges on Linux.
  await chmod(temporary, 0o755);
  const listener = createServer();
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const document = (title) => `<html><head><title>${title}</title></head><body><div id="root">${title}</div></body></html>`;
  async function file(relative, content) {
    const target = path.join(temporary, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  const encodedArtist = '/headliners/hl-%D0%B0%D1%80%D0%B8%D1%8F';
  await file('dist/index.html', document('App shell'));
  await file('dist/404.html', document('Not found'));
  await file('dist/headliners/index.html', document('Artists'));
  await file('dist/headliners/2027/index.html', document('Artists 2027'));
  await file('dist/headliners/2026/index.html', document('Artists 2026'));
  await file('dist' + encodedArtist + '/index.html', document('Ария SEO'));
  await file('dist/sitemap.xml', `<urlset><url><loc>${origin}/</loc></url><url><loc>${origin}/headliners/2027</loc></url><url><loc>${origin}/headliners/2026</loc></url><url><loc>${origin}${encodedArtist}</loc></url></urlset>`);
  await file('dist/api/data', JSON.stringify({
    festival: { year: 2027 },
    headliners: [{ id: 'hl-чайф', years: [2026] }, { id: 'hl-ария', years: [2026] }],
    schedule: [{ id: 'ren-tv-2026-07-09-16:00-КАЛИНОВ МОСТ' }],
    autographs: [{ id: 'auto-2026-07-09-18:00-F.P.G.' }],
    foodcourt: [{ id: 'new-food-court' }],
    stages: [{ id: 'ren-tv' }],
    mapPois: { features: [{ properties: { id: 'new-poi' } }] },
  }));
  for (const name of ['nginx.security-headers.conf', 'nginx.spa-routes.map', 'nginx.spa-locations.conf']) {
    const content = await readFile(new URL('../deploy/' + name, import.meta.url), 'utf8');
    await file('deploy/' + name, content.replaceAll('__DEPLOY_PATH__', nginxPath(temporary)).replaceAll('__FESTIVAL_YEAR__', '2027'));
  }
  await file('logs/.keep', '');
  await file('temp/.keep', '');
  await file('nginx.conf', `
worker_processes 1;
pid nginx.pid;
error_log logs/error.log;
events { worker_connections 128; }
http {
  access_log off;
  default_type text/html;
  include deploy/nginx.spa-routes.map;
  server {
    listen 127.0.0.1:${port};
    server_name localhost;
    location = /api/data { root ${nginxPath(temporary)}/dist; default_type application/json; }
    location /assets/ { root ${nginxPath(temporary)}/dist; try_files $uri =404; }
    include deploy/nginx.spa-locations.conf;
  }
}
`);
  const args = ['-p', nginxPath(temporary) + '/', '-c', 'nginx.conf'];
  const configTest = spawnSync(nginx, [...args, '-t'], { encoding: 'utf8', windowsHide: true });
  assert.equal(configTest.status, 0, configTest.error?.message ?? configTest.stderr);
  processHandle = spawn(nginx, args, { stdio: 'ignore', windowsHide: true });
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(origin);
      await response.text();
      break;
    } catch (error) {
      if (attempt >= 40) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  const result = await checkWebRoutes(origin);
  assert.deepEqual(result.failures, [], result.failures.join('\n'));
  for (const suffix of ['', '?utm_source=refresh']) {
    const response = await fetch(origin + encodedArtist + suffix);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Ария SEO/, 'existing SEO pages must take precedence over the app shell');
  }
  console.log(`test-web-routes: actual nginx passed ${result.requests + 2} HTTP checks`);
} finally {
  if (processHandle) {
    spawnSync(nginx, ['-p', nginxPath(temporary) + '/', '-c', 'nginx.conf', '-s', 'quit'], { windowsHide: true });
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        await readFile(path.join(temporary, 'nginx.pid'));
      } catch (error) {
        if (error.code === 'ENOENT') break;
        throw error;
      }
      assert.ok(attempt < 49, 'nginx did not shut down');
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  assert.equal(path.dirname(temporary), path.resolve(tmpdir()));
  assert.ok(path.basename(temporary).startsWith('uletay-web-routes-'));
  await rm(temporary, { recursive: true, force: true });
}
