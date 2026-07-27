import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const handlers = new Map();
const shown = [];
const navigations = [];
let focused = 0;

const client = {
  url: 'https://uletay.ru/',
  async focus() {
    focused += 1;
  },
  async navigate(url) {
    navigations.push(url);
  },
};

const context = {
  URL,
  Promise,
  console,
  clients: {
    async matchAll() {
      return [client];
    },
    async openWindow(url) {
      navigations.push(url);
    },
  },
  self: {
    location: { origin: 'https://uletay.ru' },
    clients: { claim: async () => undefined },
    registration: {
      async showNotification(title, options) {
        shown.push({ title, options });
      },
    },
    skipWaiting: async () => undefined,
    addEventListener(type, handler) {
      handlers.set(type, handler);
    },
  },
};

runInNewContext(readFileSync(new URL('../public/push-sw.js', import.meta.url), 'utf8'), context);

async function dispatch(type, event) {
  let pending = Promise.resolve();
  handlers.get(type)({
    ...event,
    waitUntil(value) {
      pending = Promise.resolve(value);
    },
  });
  await pending;
}

await dispatch('push', {
  data: {
    json: () => ({
      title: 'Изменение в расписании',
      body: 'Выступление перенесено',
      url: '/schedule/live/performance-42',
    }),
  },
});

assert.equal(shown.length, 1);
assert.equal(shown[0].title, 'Изменение в расписании');
assert.equal(shown[0].options.body, 'Выступление перенесено');
assert.equal(shown[0].options.data.url, '/schedule/live/performance-42');

await dispatch('notificationclick', {
  notification: {
    data: shown[0].options.data,
    close() {},
  },
});

assert.equal(focused, 1);
assert.deepEqual(navigations, ['https://uletay.ru/schedule/live/performance-42']);

await dispatch('push', {
  data: {
    json: () => ({
      title: 'Небезопасная ссылка',
      body: 'Проверка фильтра',
      url: 'https://example.com/phishing',
    }),
  },
});

assert.equal(shown[1].options.data.url, '/');
console.log('Web Push service worker: payload, notification display, click navigation and URL filter OK');
