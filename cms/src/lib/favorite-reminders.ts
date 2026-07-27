import type { ResultSetHeader } from 'mysql2';
import type { AppData } from '@/types';
import { getAppData } from './app-data';
import { getPool } from './db';
import {
  sendWebPushToSubscription,
  type WebPushPayload,
  type WebSubscriptionRow,
} from './push';

export const FAVORITE_REMINDER_LEAD_MS = 10 * 60 * 1000;
export const FAVORITE_REMINDER_GRACE_MS = 2 * 60 * 1000;

export type FavoriteReminderCandidate = WebPushPayload & {
  favoriteKey: string;
  reminderKey: string;
  startsAt: Date;
};

type FavoriteSubscriptionRow = WebSubscriptionRow & {
  favorite_key: string;
};

export type FavoriteReminderRunResult = {
  dueEvents: number;
  matchingSubscriptions: number;
  sent: number;
  skipped: number;
  failed: number;
  errors: string[];
};

function parseFestivalLocalDateTime(date: string, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(
    `${date}T${String(hours).padStart(2, '0')}:${String(minutes ?? 0).padStart(2, '0')}:00+04:00`,
  );
}

function isDue(startsAt: Date, now: Date): boolean {
  const nowMs = now.getTime();
  const reminderAt = startsAt.getTime() - FAVORITE_REMINDER_LEAD_MS;
  return (
    nowMs >= reminderAt &&
    nowMs < reminderAt + FAVORITE_REMINDER_GRACE_MS &&
    nowMs < startsAt.getTime()
  );
}

export function buildFavoriteReminderCandidates(
  data: Pick<AppData, 'schedule' | 'autographs'>,
  now = new Date(),
): FavoriteReminderCandidate[] {
  const candidates: FavoriteReminderCandidate[] = [];

  for (const performance of data.schedule) {
    const startsAt = parseFestivalLocalDateTime(performance.date, performance.startTime);
    if (!isDue(startsAt, now)) {
      continue;
    }
    const favoriteKey = `perf:${performance.id}`;
    candidates.push({
      favoriteKey,
      reminderKey: `${favoriteKey}@${performance.date}T${performance.startTime}`,
      startsAt,
      title: 'Скоро выступление',
      body: `Через 10 минут: ${performance.artist} (${performance.startTime})`,
      url: `/schedule/live/${encodeURIComponent(performance.id)}`,
      tag: `favorite-${favoriteKey}`,
      ttlSeconds: 900,
    });
  }

  for (const session of data.autographs) {
    const startsAt = parseFestivalLocalDateTime(session.date, session.startTime);
    if (!isDue(startsAt, now)) {
      continue;
    }
    const favoriteKey = `auto:${session.id}`;
    candidates.push({
      favoriteKey,
      reminderKey: `${favoriteKey}@${session.date}T${session.startTime}`,
      startsAt,
      title: 'Скоро автограф-сессия',
      body: `Через 10 минут: ${session.artist} (${session.startTime})`,
      url: `/autographs/${encodeURIComponent(session.id)}`,
      tag: `favorite-${favoriteKey}`,
      ttlSeconds: 900,
    });
  }

  return candidates;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function sendDueFavoriteReminders(
  now = new Date(),
  sender: typeof sendWebPushToSubscription = sendWebPushToSubscription,
): Promise<FavoriteReminderRunResult> {
  const pool = getPool();
  const candidates = buildFavoriteReminderCandidates(await getAppData(), now);
  const result: FavoriteReminderRunResult = {
    dueEvents: candidates.length,
    matchingSubscriptions: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };
  if (!candidates.length) {
    return result;
  }

  const byFavoriteKey = new Map(candidates.map((candidate) => [candidate.favoriteKey, candidate]));
  const [rows] = await pool.query<FavoriteSubscriptionRow[]>(
    `SELECT subscriptions.id, subscriptions.endpoint, subscriptions.p256dh,
            subscriptions.auth_secret, favorites.favorite_key
     FROM push_subscriptions subscriptions
     INNER JOIN push_subscription_favorites favorites
       ON favorites.subscription_id = subscriptions.id
     WHERE subscriptions.active = TRUE
       AND subscriptions.platform = 'web'
       AND subscriptions.endpoint IS NOT NULL
       AND favorites.favorite_key IN (${candidates.map(() => '?').join(', ')})`,
    candidates.map((candidate) => candidate.favoriteKey),
  );
  result.matchingSubscriptions = rows.length;

  for (const row of rows) {
    const candidate = byFavoriteKey.get(row.favorite_key);
    if (!candidate) {
      continue;
    }
    const [claim] = await pool.query<ResultSetHeader>(
      `INSERT IGNORE INTO push_reminder_deliveries (subscription_id, reminder_key)
       VALUES (?, ?)`,
      [row.id, candidate.reminderKey],
    );
    if (claim.affectedRows === 0) {
      result.skipped += 1;
      continue;
    }

    try {
      await sender(row, candidate);
      result.sent += 1;
    } catch (error) {
      result.failed += 1;
      await pool.query(
        `DELETE FROM push_reminder_deliveries
         WHERE subscription_id = ? AND reminder_key = ?`,
        [row.id, candidate.reminderKey],
      );
      const statusCode = (error as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await pool.query('UPDATE push_subscriptions SET active = FALSE WHERE id = ?', [row.id]);
      } else {
        result.errors.push(getErrorMessage(error));
      }
    }
  }

  result.errors = [...new Set(result.errors)].slice(0, 5);
  return result;
}
