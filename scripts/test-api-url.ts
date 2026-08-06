import assert from 'node:assert/strict';
import { resolveWebApiBaseUrl } from '../src/config/web-api-base-url';

const productionBaseUrl = 'https://uletayapp.ru/api';

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

console.log('API URL resolver: loopback isolation and production fallback OK');
