import assert from 'node:assert/strict';
import { isIsolatedPreviewUrl, isLocalNetworkUrl, resolveWebApiBaseUrl } from '../src/config/web-api-base-url';

const productionBaseUrl = 'https://uletayapp.ru/api';

assert.equal(resolveWebApiBaseUrl({hostname:'festival-preview.trycloudflare.com',origin:'https://festival-preview.trycloudflare.com',port:'',configured:productionBaseUrl,productionBaseUrl}), 'https://festival-preview.trycloudflare.com/api');
assert.equal(isIsolatedPreviewUrl('https://festival-preview.trycloudflare.com/api'), true);
assert.equal(isIsolatedPreviewUrl('https://festival-preview.trycloudflare.com.evil.test/api'), false);
assert.equal(isIsolatedPreviewUrl(productionBaseUrl), false);
assert.equal(resolveWebApiBaseUrl({hostname:'preview.app.lhr.life',origin:'https://preview.app.lhr.life',port:'',configured:productionBaseUrl,productionBaseUrl}), 'https://preview.app.lhr.life/api');
assert.equal(isIsolatedPreviewUrl('https://preview.app.lhr.life/api'), true);
assert.equal(isIsolatedPreviewUrl('https://preview.app.lhr.life.evil.test/api'), false);

assert.equal(
  resolveWebApiBaseUrl({
    hostname: 'uletay.localhost', origin: 'http://uletay.localhost:4174', port: '4174',
    configured: productionBaseUrl, productionBaseUrl,
  }),
  'http://uletay.localhost:4174/api',
  'Local offline/PWA testing must never fetch production data',
);

assert.equal(
  resolveWebApiBaseUrl({
    hostname: '127.0.0.1',
    origin: 'http://127.0.0.1:4174',
    port: '4174',
    configured: productionBaseUrl,
    productionBaseUrl,
  }),
  'http://127.0.0.1:4174/api',
);

assert.equal(
  resolveWebApiBaseUrl({
    hostname: 'localhost',
    origin: 'http://localhost:4174',
    port: '4174',
    configured: 'http://localhost:3000/api',
    productionBaseUrl,
  }),
  'http://localhost:4174/api',
);

assert.equal(
  resolveWebApiBaseUrl({
    hostname: 'localhost',
    origin: 'http://localhost:8081',
    port: '8081',
    configured: 'http://localhost:3000/api',
    productionBaseUrl,
  }),
  'http://localhost:3000/api',
);

assert.equal(
  resolveWebApiBaseUrl({
    hostname: '127.0.0.1',
    origin: 'http://127.0.0.1:8081',
    port: '8081',
    configured: productionBaseUrl,
    productionBaseUrl,
  }),
  'http://localhost:3000/api',
);

assert.equal(
  resolveWebApiBaseUrl({
    hostname: 'uletayapp.ru',
    origin: 'https://uletayapp.ru',
    port: '',
    configured: productionBaseUrl,
    productionBaseUrl,
  }),
  productionBaseUrl,
);

assert.equal(
  resolveWebApiBaseUrl({
    hostname: 'uletayapp.ru',
    origin: 'https://uletayapp.ru',
    port: '',
    configured: 'http://localhost:3000/api',
    productionBaseUrl,
  }),
  productionBaseUrl,
);

for (const hostname of ['192.168.1.130','10.0.0.12','172.16.0.2','172.31.255.1','169.254.1.2','festival.local','[fd12::1]']) {
  const origin=`http://${hostname}:4174`;
  assert.equal(resolveWebApiBaseUrl({hostname,origin,port:'4174',configured:productionBaseUrl,productionBaseUrl}),`${origin}/api`,'LAN previews stay on their own API');
  assert.equal(isLocalNetworkUrl(`${origin}/api`),true,'LAN APIs must disable public fallbacks');
}
for (const hostname of ['172.15.0.1','172.32.0.1','192.169.1.1','uletayapp.ru']) {
  assert.equal(isLocalNetworkUrl(`https://${hostname}/api`),false,'Public origins must retain normal failover');
}
assert.equal(resolveWebApiBaseUrl({hostname:'192.168.1.130',origin:'http://192.168.1.130:8081',port:'8081',configured:'http://localhost:3000/api',productionBaseUrl}),'http://192.168.1.130:3000/api','Phone must not request its own localhost');
console.log('API URL resolver: loopback/LAN isolation, phone development URLs and production fallback OK');
