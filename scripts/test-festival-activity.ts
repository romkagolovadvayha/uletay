import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AppData } from '../src/types';
import { buildFestivalActivityEvents } from '../src/utils/festivalActivityEvents';

const data = {
  stages: [{ id: 'south', name: 'Южная сцена' }],
  schedule: [
    { id: 'night', artist: 'Ночная группа', stageId: 'south', date: '2027-07-16', startTime: '23:50', endTime: '00:40' },
    { id: 'early', artist: 'Кипелов', stageId: 'south', date: '2027-07-16', startTime: '18:00', endTime: '19:00' },
    { id: 'invalid', artist: 'Ошибка', stageId: 'south', date: 'invalid', startTime: 'bad', endTime: 'bad' },
  ],
  autographs: [{ id: 'sign', artist: 'Мельница', stageId: 'south', location: 'Шатёр автографов', date: '2027-07-16', startTime: '20:00', endTime: '20:30' }],
} as unknown as AppData;
const now = Date.parse('2027-07-16T17:00:00+04:00');
const rows = buildFestivalActivityEvents(['perf:night', 'perf:early', 'perf:invalid', 'auto:sign', 'food:one'], data, now);
assert.deepEqual(rows.map(row => row.id), ['perf:early', 'auto:sign', 'perf:night']);
assert.equal(rows[0].startAt, Date.parse('2027-07-16T18:00:00+04:00'));
assert.equal(rows[2].endAt, Date.parse('2027-07-17T00:40:00+04:00'));
assert.equal(rows[1].stage, 'Шатёр автографов');
assert.equal(rows[0].url, '/schedule/live/early');
assert.equal(rows[1].url, '/autographs/sign');
assert.equal(buildFestivalActivityEvents([], data, now).length, 0);
assert.equal(buildFestivalActivityEvents(['perf:early'], data, rows[0].endAt).length, 0);
assert.equal(buildFestivalActivityEvents(['perf:early'], data, rows[0].startAt + 1).length, 1);
const model = (path: string) => readFileSync(path, 'utf8').replace(/^\/\/.*$/gm, '').trim();
assert.equal(model('modules/festival-activity/ios/FestivalActivityAttributes.swift'), model('targets/festival-widget/FestivalActivityAttributes.swift'), 'Host and widget must use identical ActivityKit attributes');
assert.equal(model('modules/festival-activity/ios/FestivalActivityContentState.swift'), model('targets/festival-widget/FestivalActivityContentState.swift'), 'Host and widget must decode identical APNs state');
console.log('Festival activity: favorites, time zone, midnight, expiry, links and shared iOS protocol passed.');
