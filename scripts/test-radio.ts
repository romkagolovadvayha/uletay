import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseLiscaseRadioSnapshot } from '../src/utils/radioSnapshot';
import { RADIO_STATE_URL, RADIO_STREAM_URL } from '../src/config/radio';

const current = { id: 158, artist: 'Король и Шут', title: 'Мёртвый анархист',
  cover: 'https://api.prostoj.store/v1/radio/cover?id=158', duration: 247.8, position: 30 };
const state = (changes = {}) => ({ success: true, data: {
  available: true, healthy: true, station: { id: 6 }, current,
  queue: [{ ...current, id: 170, title: 'Следующая' }], previous: { ...current, id: 164 }, ...changes,
} });

test('current, artwork, previous and exact queue order come from station six', () => {
  const snapshot = parseLiscaseRadioSnapshot(state());
  assert.equal(snapshot.stationId, 6);
  assert.equal(snapshot.artist, current.artist);
  assert.equal(snapshot.title, current.title);
  assert.equal(snapshot.artworkUrl, current.cover);
  assert.equal(snapshot.duration, 247.8);
  assert.equal(snapshot.position, 30);
  assert.deepEqual(snapshot.queue.map(track => track.id), [170]);
  assert.equal(snapshot.previous?.id, 164);
  assert.match(RADIO_STATE_URL, /id=6$/);
  assert.match(RADIO_STREAM_URL, /station-6\.mp3$/);
});

test('empty and unavailable stations are valid without stale queue/current', () => {
  assert.equal(parseLiscaseRadioSnapshot(state({ current: null, queue: [] })).raw, '');
  for (const flags of [{ available: false }, { healthy: false }]) {
    const snapshot = parseLiscaseRadioSnapshot(state(flags));
    assert.equal(snapshot.available, false);
    assert.equal(snapshot.raw, '');
    assert.deepEqual(snapshot.queue, []);
  }
});

test('rejects errors, old provider and wrong station responses', () => {
  for (const value of [null, '<html>Error</html>', {}, { success: false }, { title: 'Old station' },
    state({ station: { id: 1 } }), state({ queue: null }), state({ available: 'true' })]) {
    assert.throws(() => parseLiscaseRadioSnapshot(value));
  }
});

test('missing artwork and invalid numeric data are safe; queue remains in broadcast order', () => {
  const snapshot = parseLiscaseRadioSnapshot(state({ current: { ...current, cover: 'javascript:alert(1)', duration: -1, position: Infinity },
    queue: [null, { ...current, id: 2 }, {}, { ...current, id: 1 }, { ...current, id: 2 }] }));
  assert.equal(snapshot.artworkUrl, undefined);
  assert.equal(snapshot.duration, undefined);
  assert.equal(snapshot.position, undefined);
  assert.deepEqual(snapshot.queue.map(track => track.id), [2, 1, 2]);
});

test('accepts pre-extension liscase response during rolling deployment', () => {
  const now = new Date('2026-09-27T12:00:00Z');
  const snapshot = parseLiscaseRadioSnapshot(state({ station: undefined, previous: undefined }), now);
  assert.equal(snapshot.previous, null);
  assert.equal(snapshot.updatedAt, now.toISOString());
  const dated = parseLiscaseRadioSnapshot(state({ updatedAt: '2026-09-27T11:59:59Z' }), now);
  assert.equal(dated.updatedAt, '2026-09-27T11:59:59Z');
});

test('CMS coalesces concurrent requests, caches briefly and never hides upstream failure', async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  let now = originalNow();
  let requests = 0;
  let fail = false;
  Date.now = () => now;
  globalThis.fetch = async (url) => {
    requests++;
    assert.equal(url, RADIO_STATE_URL);
    return new Response(JSON.stringify(fail ? { error: 'down' } : state()), { status: fail ? 503 : 200 });
  };
  try {
    const { getRadioSnapshot } = await import('../cms/src/lib/radio-liscase');
    const snapshots = await Promise.all([getRadioSnapshot(), getRadioSnapshot(), getRadioSnapshot()]);
    assert.equal(requests, 1);
    assert.equal(snapshots[0].title, current.title);
    await getRadioSnapshot();
    assert.equal(requests, 1);
    now += 4000;
    fail = true;
    await assert.rejects(getRadioSnapshot());
    fail = false;
    await getRadioSnapshot();
    assert.equal(requests, 3);
  } finally { globalThis.fetch = originalFetch; Date.now = originalNow; }
});
