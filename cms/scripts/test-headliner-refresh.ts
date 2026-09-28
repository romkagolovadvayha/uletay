import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import type { AppData } from '../src/types';
import type { HeadlinerLastFmProfile } from '../src/lastfm-types';
import { AppDataConflictError } from '../src/lib/app-data';
import { refreshHeadlinerMusic, type HeadlinerRefreshResult } from '../src/lib/headliner-refresh';
import { runHeadlinerRefreshBatch, type RefreshProgress } from '../src/lib/headliner-refresh-batch';
import { resolveHeadlinerLastFm } from '../src/lib/headliner-lastfm-resolve';
import { resolveLastFmProfileForHeadliner } from '../src/lib/lastfm';

const profile: HeadlinerLastFmProfile = {
  name: 'Артист', mbid: 'artist-id', tags: [{ name: 'rock' }], similarArtists: [],
  topTracks: [{ name: 'Новая песня', rank: 1, playcount: 15 }],
  listeners: 20, playcount: 30, updatedAt: new Date().toISOString(),
};
const seed = JSON.parse(readFileSync(new URL('../seed/content.json', import.meta.url), 'utf8')) as AppData;

function fixture() {
  let stored: AppData = {
    ...structuredClone(seed), revision: 'r1', schedule: [], autographs: [],
    headliners: ['a', 'b', 'c'].map((id) => ({
      id, name: id, description: `Ручное описание ${id}`, years: [2026], imageTint: '#123456',
      imageUrl: `/manual-${id}.webp`, alternateNames: [`Другое имя ${id}`],
      linkedHeadlinerIds: id === 'a' ? ['b'] : id === 'b' ? ['a'] : [],
      lastfm: { ...profile, name: id, mbid: id, topTracks: [{ name: 'Старая песня', rank: 1 }] },
    })),
  };
  let requests = 0;
  let writes = 0;
  const dependencies = {
    getAppData: async () => structuredClone(stored),
    saveAppData: async (data: AppData) => {
      if (data.revision !== stored.revision) throw new AppDataConflictError();
      data.revision = `r${++writes + 1}`;
      stored = structuredClone(data);
    },
    assertConfigured: () => {},
    resolveProfile: async (_artist: unknown, _all: unknown, options?: { strict?: boolean }) => {
      requests++;
      assert.equal(options?.strict, true);
      return structuredClone(profile) as HeadlinerLastFmProfile | null;
    },
  };
  return { dependencies, get stored() { return stored; }, get requests() { return requests; }, get writes() { return writes; } };
}

async function testRefresh() {
  const f = fixture();
  const before = structuredClone(f.stored);
  const result = await refreshHeadlinerMusic('a', 'r1', f.dependencies);
  assert(result.ok);
  assert.deepEqual(result.updatedIds, ['a', 'b']);
  assert.equal(result.revision, 'r2');
  assert.equal(f.requests, 1, 'Even a fresh profile must be fetched again');
  for (const id of ['a', 'b']) {
    const actual = f.stored.headliners.find((item) => item.id === id)!;
    const original = before.headliners.find((item) => item.id === id)!;
    assert.deepEqual(actual, { ...original, lastfm: profile }, 'Only the API profile changes');
  }
  assert.deepEqual(f.stored.headliners[2], before.headliners[2]);
  assert.deepEqual(resolveHeadlinerLastFm(f.stored.headliners[0], f.stored.headliners)?.topTracks, [
    { ...profile.topTracks[0], artistName: profile.name },
  ], 'Public data must neither retain old tracks nor double the statistics');

  for (const revision of [undefined, '', 'old']) {
    const stale = fixture();
    const result = await refreshHeadlinerMusic('a', revision, stale.dependencies);
    assert(!result.ok && result.stopBatch);
    assert.equal(stale.requests, 0);
    assert.equal(stale.writes, 0);
  }
  const unknown = fixture();
  assert.equal((await refreshHeadlinerMusic('missing', 'r1', unknown.dependencies)).ok, false);
  assert.equal(unknown.requests, 0);

  const missingKey = fixture();
  missingKey.dependencies.assertConfigured = () => { throw new Error('private config'); };
  const noKey = await refreshHeadlinerMusic('a', 'r1', missingKey.dependencies);
  assert(!noKey.ok && noKey.stopBatch && noKey.error.includes('ключ'));
  assert.equal(missingKey.requests, 0);

  const notFound = fixture();
  notFound.dependencies.resolveProfile = async () => null;
  const missing = await refreshHeadlinerMusic('a', 'r1', notFound.dependencies);
  assert(!missing.ok && !missing.stopBatch);
  assert.equal(notFound.writes, 0);
  assert.equal(notFound.stored.headliners[0].lastfm?.topTracks[0].name, 'Старая песня');

  const failed = fixture();
  failed.dependencies.resolveProfile = async () => { throw new Error('secret-proxy-url'); };
  const outage = await refreshHeadlinerMusic('a', 'r1', failed.dependencies);
  assert(!outage.ok && outage.stopBatch && !outage.error.includes('secret-proxy-url'));
  assert.equal(failed.writes, 0);

  const conflict = fixture();
  conflict.dependencies.resolveProfile = async () => {
    conflict.stored.revision = 'other-editor';
    conflict.stored.headliners[0].description = 'Чужая правка';
    return profile;
  };
  const concurrent = await refreshHeadlinerMusic('a', 'r1', conflict.dependencies);
  assert(!concurrent.ok && concurrent.stopBatch && concurrent.error.includes('изменены'));
  assert.equal(conflict.writes, 0);
  assert.equal(conflict.stored.headliners[0].description, 'Чужая правка');
}

async function testBatch() {
  const artists = ['a', 'b', 'c'].map((id) => ({ id, name: id }));
  const f = fixture();
  const calls: string[] = [];
  const progress: RefreshProgress[] = [];
  await runHeadlinerRefreshBatch(artists, 'r1', {
    refresh: async (id, revision) => { calls.push(id); return refreshHeadlinerMusic(id, revision, f.dependencies); },
    onSuccess: () => {}, onProgress: (state) => progress.push(state),
    isCancelled: () => false, pause: async () => {},
  });
  assert.deepEqual(calls, ['a', 'c'], 'Linked artists must be fetched only once');
  assert.equal(f.writes, 2, 'The returned revision must be passed to the next request');
  assert.deepEqual(progress.at(-1), { total: 3, completed: 3, updated: 3, errors: [], current: undefined, stopped: false });

  for (const scenario of ['missing', 'outage', 'network', 'cancel'] as const) {
    const called: string[] = [];
    let state: RefreshProgress | undefined;
    await runHeadlinerRefreshBatch(artists, 'r1', {
      refresh: async (id): Promise<HeadlinerRefreshResult> => {
        called.push(id);
        if (scenario === 'network') throw new Error('disconnected');
        if (scenario === 'missing' || scenario === 'outage') return { ok: false, error: scenario, stopBatch: scenario === 'outage' };
        return { ok: true, revision: 'r2', updatedIds: [id], profile };
      },
      onSuccess: () => {}, onProgress: (next) => { state = next; },
      isCancelled: () => scenario === 'cancel' && called.length > 0,
      pause: async () => {},
    });
    assert.equal(called.length, scenario === 'missing' ? 3 : 1);
    assert.equal(state?.stopped, scenario !== 'missing');
    assert.equal(state?.updated, scenario === 'cancel' ? 1 : 0);
  }
}

async function testStrictApiFailures() {
  const envNames = ['LASTFM_API_KEY', 'LASTFM_PROXY_URL', 'HTTPS_PROXY', 'HTTP_PROXY'];
  const env = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
  envNames.forEach((name) => delete process.env[name]);
  process.env.LASTFM_API_KEY = 'test-key';
  const dispatcher = getGlobalDispatcher();
  const agent = new MockAgent();
  agent.disableNetConnect();
  setGlobalDispatcher(agent);
  const pool = agent.get('https://ws.audioscrobbler.com');
  try {
    for (const code of [10, 11, 26, 29]) {
      pool.intercept({ path: /method=artist.getinfo/ }).reply(200, { error: code, message: 'API unavailable' });
      pool.intercept({ path: /method=artist.gettoptracks/ }).reply(200, { toptracks: { track: [] } });
      await assert.rejects(resolveLastFmProfileForHeadliner('Fixture', { strict: true }));
    }
    pool.intercept({ path: /method=artist.getinfo/ }).reply(503, 'Unavailable');
    pool.intercept({ path: /method=artist.gettoptracks/ }).reply(200, { toptracks: { track: [] } });
    await assert.rejects(resolveLastFmProfileForHeadliner('Fixture', { strict: true }));

    pool.intercept({ path: /method=artist.getinfo/ }).reply(200, { error: 6, message: 'Artist not found' });
    pool.intercept({ path: /method=artist.gettoptracks/ }).reply(200, { toptracks: { track: [] } });
    pool.intercept({ path: /method=artist.search/ }).reply(200, { results: { artistmatches: { artist: [] } } });
    assert.equal(await resolveLastFmProfileForHeadliner('Fixture', { strict: true }), null);
    agent.assertNoPendingInterceptors();
  } finally {
    setGlobalDispatcher(dispatcher);
    await agent.close();
    for (const name of envNames) {
      if (env[name] === undefined) delete process.env[name];
      else process.env[name] = env[name];
    }
  }
}

async function main() {
  await testRefresh();
  await testBatch();
  await testStrictApiFailures();
  console.log('Artist refresh: linked groups, forced reload, revisions, preserved content, batch progress/cancellation and API failures passed.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
