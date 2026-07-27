import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import { getAppData } from '../src/lib/app-data';
import { getPool } from '../src/lib/db';
import { sendDueFavoriteReminders } from '../src/lib/favorite-reminders';
import { registerWebPushSubscription } from '../src/lib/push';

const endpoint = `https://push.example.test/${randomUUID()}`;
const subscription = {
  endpoint,
  keys: {
    p256dh: 'A'.repeat(65),
    auth: 'B'.repeat(24),
  },
};

async function favoriteKeysForTestSubscription(): Promise<string[]> {
  const [rows] = await getPool().query<(RowDataPacket & { favorite_key: string })[]>(
    `SELECT favorites.favorite_key
     FROM push_subscription_favorites favorites
     INNER JOIN push_subscriptions subscriptions
       ON subscriptions.id = favorites.subscription_id
     WHERE subscriptions.endpoint = ?
     ORDER BY favorites.favorite_key`,
    [endpoint],
  );
  return rows.map((row) => row.favorite_key);
}

async function main() {
  try {
    await registerWebPushSubscription(subscription, 'uletay-integration-test', [
      'perf:performance-42',
      'auto:session-42',
      'food:vendor-42',
    ]);
    assert.deepEqual(await favoriteKeysForTestSubscription(), [
      'auto:session-42',
      'perf:performance-42',
    ]);

    const performance = (await getAppData()).schedule[0];
    assert.ok(performance, 'schedule must contain at least one performance');
    await registerWebPushSubscription(subscription, 'uletay-integration-test', [
      `perf:${performance.id}`,
    ]);
    const reminderAt = new Date(
      `${performance.date}T${performance.startTime}:00+04:00`,
    );
    reminderAt.setMinutes(reminderAt.getMinutes() - 10);
    let deliveries = 0;
    const firstRun = await sendDueFavoriteReminders(
      reminderAt,
      async (target, payload) => {
        assert.equal(target.endpoint, endpoint);
        assert.equal(payload.url, `/schedule/live/${encodeURIComponent(performance.id)}`);
        deliveries += 1;
      },
    );
    const secondRun = await sendDueFavoriteReminders(
      reminderAt,
      async () => {
        deliveries += 1;
      },
    );
    assert.equal(firstRun.sent, 1);
    assert.equal(secondRun.skipped, 1);
    assert.equal(deliveries, 1, 'deduplication must prevent a second push');

    await registerWebPushSubscription(subscription, 'uletay-integration-test', []);
    assert.deepEqual(await favoriteKeysForTestSubscription(), []);
    console.log('Web push favorite persistence, delivery selection and deduplication: OK');
  } finally {
    await getPool().query('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
    await getPool().end();
  }
}

main().catch((error) => {
  console.error('Web push favorite integration test failed:', error);
  process.exit(1);
});
