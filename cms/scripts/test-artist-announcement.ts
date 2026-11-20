import './load-env';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { config } from '../src/lib/config';
import { getPool } from '../src/lib/db';
import { AppDataConflictError, getAppData, getClientAppData, saveAppData } from '../src/lib/app-data';
import { saveArtistAndAnnounce } from '../src/lib/artist-announcement';
import { getSafePushPath } from '../../src/utils/pushNavigation';
import { decodeSeoRouteParam } from '../../src/seo/seoRouteUtils';
import type { PushBroadcastInput } from '../src/lib/push';

async function main() {
  assert.equal(config.dbPort, 3352, 'Only isolated preview DB');
  assert.equal(config.dbName, 'uletay_web_design', 'Never run against production');
  const id = `qa-announcement-${randomBytes(6).toString('hex')}`;
  const messages: PushBroadcastInput[] = [];
  const broadcast = async (payload: PushBroadcastInput, adminId: number) => {
    assert.equal(adminId, 17);
    assert((await getClientAppData()).headliners.find(item => item.id === id)?.years.includes(2027), 'The public lineup is committed before delivery');
    messages.push(payload);
    return { nativeAccepted: 2, nativeFailed: 0, webSent: 1, webFailed: 0, errors: [] };
  };
  try {
    const initial = await getAppData();
    assert.equal(initial.festival.year, 2027);
    initial.headliners.push({id, name: 'Тест объявления артиста', description: 'Ручное описание', years: [2026], genres: ['Рок'], alternateNames: ['Дополнительное имя'], imageTint: '#45092a'});
    await saveAppData(initial);
    const a = await getAppData(), b = structuredClone(a);
    const results = await Promise.allSettled([
      saveArtistAndAnnounce(a, id, 17, false, {save: saveAppData, broadcast}),
      saveArtistAndAnnounce(b, id, 17, false, {save: saveAppData, broadcast}),
    ]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    const failure = results.find(result => result.status === 'rejected');
    assert(failure?.status === 'rejected' && failure.reason instanceof AppDataConflictError);
    assert.equal(messages.length, 1, 'Concurrent double click sends one broadcast');
    assert.equal(messages[0].audience, 'all');
    assert(messages[0].body.includes('Тест объявления артиста'));
    const path = getSafePushPath(messages[0].targetPath);
    assert(path);
    assert.equal(decodeSeoRouteParam(path.split('/').at(-1)!), id, 'Notification opens this artist');
    let saved = await getAppData();
    const artist = saved.headliners.find(item => item.id === id)!;
    assert.deepEqual(artist.years, [2027, 2026]);
    assert.deepEqual(artist.genres, ['Рок']);
    assert.deepEqual(artist.alternateNames, ['Дополнительное имя']);
    assert.equal(artist.description, 'Ручное описание');
    const duplicate = await saveArtistAndAnnounce(saved, id, 17, true, {save: saveAppData, broadcast});
    assert.equal(duplicate.status, 'already');
    assert.equal(messages.length, 1, 'An existing participant is never sent again');
    saved = await getAppData();
    saved.revision = '0'.repeat(64);
    await assert.rejects(saveArtistAndAnnounce(saved, id, 17, false, {save: saveAppData, broadcast}), AppDataConflictError);
    assert.equal(messages.length, 1);
    saved = await getAppData();
    const warning = await saveArtistAndAnnounce(saved, id, 17, false, {save: saveAppData, broadcast: async () => { throw new Error('Transport unavailable'); }});
    assert.equal(warning.status, 'warning');
    assert((await getAppData()).headliners.find(item => item.id === id)?.years.includes(2027), 'Delivery errors preserve the lineup');
    saved = await getAppData();
    const partial = await saveArtistAndAnnounce(saved, id, 17, false, {save: saveAppData, broadcast: async () => ({nativeAccepted: 1, nativeFailed: 1, webSent: 0, webFailed: 0, errors: ['Provider failure']})});
    assert.equal(partial.status, 'warning');
    console.log('Artist announcement: real DB concurrency, save-before-send, all audiences, deep link, preserved metadata, duplicate/stale clicks, transport and partial failures passed. No external push was sent.');
  } finally {
    const cleanup = await getAppData();
    cleanup.headliners = cleanup.headliners.filter(item => item.id !== id);
    await saveAppData(cleanup);
    await getPool().end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
