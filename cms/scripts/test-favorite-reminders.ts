import assert from 'node:assert/strict';
import { buildFavoriteReminderCandidates } from '../src/lib/favorite-reminders';

const data = {
  schedule: [
    {
      id: 'south-artist',
      stageId: 'south' as const,
      date: '2026-07-27',
      startTime: '21:30',
      endTime: '22:30',
      headlinerId: 'artist',
      artist: 'Артист',
    },
  ],
  autographs: [
    {
      id: 'artist-session',
      stageId: 'south' as const,
      date: '2026-07-27',
      startTime: '22:00',
      endTime: '22:20',
      headlinerId: 'artist',
      artist: 'Артист',
    },
  ],
};

assert.equal(
  buildFavoriteReminderCandidates(data, new Date('2026-07-27T17:19:59Z')).length,
  0,
  'performance must not be due before T-10',
);

const performanceDue = buildFavoriteReminderCandidates(
  data,
  new Date('2026-07-27T17:20:00Z'),
);
assert.equal(performanceDue.length, 1);
assert.equal(performanceDue[0].favoriteKey, 'perf:south-artist');
assert.equal(performanceDue[0].url, '/schedule/live/south-artist');
assert.equal(
  buildFavoriteReminderCandidates(data, new Date('2026-07-27T17:22:00Z')).length,
  0,
  'a delayed cron run must not send an inaccurate 10-minute reminder',
);

const autographDue = buildFavoriteReminderCandidates(
  data,
  new Date('2026-07-27T17:50:00Z'),
);
assert.equal(autographDue.length, 1);
assert.equal(autographDue[0].favoriteKey, 'auto:artist-session');
assert.equal(autographDue[0].url, '/autographs/artist-session');

assert.equal(
  buildFavoriteReminderCandidates(data, new Date('2026-07-27T17:30:00Z')).length,
  0,
  'performance must not be sent after it starts',
);

console.log('Favorite reminder timing and deep links: OK');
