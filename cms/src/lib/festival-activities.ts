import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getPool } from './db';
import { getAppData } from './app-data';
import { activityApnsConfig, ActivityApnsError, createFestivalActivitySender, sendFestivalActivityPush } from './festival-activity-apns';
import { ACTIVITY_MAX_AGE_MS, activityDate, activityStateHash, festivalActivityPayload, festivalActivityStates, parseActivityInstallation, type FestivalActivityState } from './festival-activity-model';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export class ActivityRegistrationError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function registerFestivalActivities(value: unknown, now = Date.now()) {
  let input;
  try { input = parseActivityInstallation(value); } catch { throw new ActivityRegistrationError(400, 'Invalid Live Activity registration'); }
  const nowDate = new Date(now);
  const pool = getPool(), connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('INSERT IGNORE INTO festival_activity_installations (installation_id, secret_hash, last_seen_at) VALUES (?, ?, ?)', [input.installationId, hash(input.secret), nowDate]);
    const [rows] = await connection.query<(RowDataPacket & { secret_hash: string; revision: number | string })[]>(
      'SELECT secret_hash, revision FROM festival_activity_installations WHERE installation_id = ? FOR UPDATE', [input.installationId]);
    const installation = rows[0];
    if (!installation || !timingSafeEqual(Buffer.from(installation.secret_hash, 'hex'), Buffer.from(hash(input.secret), 'hex'))) throw new ActivityRegistrationError(403, 'Invalid installation credentials');
    const currentRevision = Number(installation.revision);
    if (input.revision <= currentRevision) {
      await connection.commit(); return { ok: true, applied: false, revision: currentRevision };
    }
    await connection.query('UPDATE festival_activity_installations SET revision = ?, enabled = ?, last_seen_at = ? WHERE installation_id = ?', [input.revision, input.enabled, nowDate, input.installationId]);
    const activities = input.enabled ? input.activities : [];
    await connection.query(`UPDATE festival_live_activities SET client_active = FALSE, next_attempt_at = NULL
      WHERE installation_id = ? AND ended_at IS NULL AND client_active = TRUE
      ${activities.length ? `AND activity_id NOT IN (${activities.map(() => '?').join(',')})` : ''}`, [input.installationId, ...activities.map(row => row.activityId)]);
    for (const activity of activities) {
      const state = { endAt: activityDate(now), status: 'upcoming' as const };
      // Registration stays small and does not load/hash the entire catalog.
      // The worker derives the actual running deadline from trusted schedule data.
      const expires = new Date(now + 24 * 3600_000 + ACTIVITY_MAX_AGE_MS);
      await connection.query(`INSERT INTO festival_live_activities
        (installation_id, activity_id, favorite_key, push_token, push_token_hash, environment, last_state_json, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          next_attempt_at = IF(push_token_hash <> VALUES(push_token_hash) OR client_active = FALSE, NULL, next_attempt_at),
          last_payload_hash = IF(push_token_hash <> VALUES(push_token_hash), NULL, last_payload_hash),
          lease_token = IF(push_token_hash <> VALUES(push_token_hash), NULL, lease_token),
          lease_until = IF(push_token_hash <> VALUES(push_token_hash), NULL, lease_until),
          failures = IF(push_token_hash <> VALUES(push_token_hash), 0, failures),
          ended_at = IF(push_token_hash <> VALUES(push_token_hash) AND ended_reason = 'invalid_token', NULL, ended_at),
          ended_reason = IF(push_token_hash <> VALUES(push_token_hash) AND ended_reason = 'invalid_token', NULL, ended_reason),
          favorite_key = VALUES(favorite_key), push_token = VALUES(push_token), push_token_hash = VALUES(push_token_hash),
          environment = VALUES(environment), client_active = TRUE`,
      [input.installationId, activity.activityId, activity.favoriteKey, activity.pushToken, hash(activity.pushToken), activity.environment, JSON.stringify(state), expires, nowDate]);
    }
    await connection.commit(); return { ok: true, applied: true, revision: input.revision };
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

export type FestivalActivityRow = RowDataPacket & {
  id: number; favorite_key: string; push_token: string; push_token_hash: string;
  environment: 'production' | 'sandbox'; client_active: number; enabled: number;
  last_state_json: string; last_payload_hash: string | null; last_sent_timestamp: number | string;
  failures: number; expires_at: Date; created_at: Date;
};
export async function sendFestivalActivityUpdates(now = Date.now(), sender = sendFestivalActivityPush) {
  const settings = activityApnsConfig();
  const result = { configured: Boolean(settings), checked: 0, updated: 0, ended: 0, skipped: 0, invalidTokens: 0, failed: 0, deferred: 0 };
  if (!settings) return result;
  const pool = getPool(), states = festivalActivityStates(await getAppData(), now), at = new Date(now);
  const transport = sender === sendFestivalActivityPush ? createFestivalActivitySender() : null;
  const deliver = transport?.send || sender;
  const deadline = Date.now() + 35_000;
  try {
  while (Date.now() < deadline) {
  const [rows] = await pool.query<FestivalActivityRow[]>(`SELECT activities.*, installations.enabled
    FROM festival_live_activities activities INNER JOIN festival_activity_installations installations USING (installation_id)
    WHERE activities.ended_at IS NULL AND (activities.next_attempt_at IS NULL OR activities.next_attempt_at <= ?)
    AND (activities.lease_until IS NULL OR activities.lease_until < ?) ORDER BY activities.next_attempt_at, activities.id LIMIT 500`, [at, at]);
  // Bounded batches avoid one burst of HTTP/2 connections exhausting the API.
  for (let offset = 0; offset < rows.length; offset += 16) {
    if (Date.now() >= deadline) { result.deferred += rows.length - offset; break; }
    await Promise.all(rows.slice(offset, offset + 16).map(async row => {
      result.checked++;
      const current = states.get(row.favorite_key);
      let previous: FestivalActivityState;
      try { previous = JSON.parse(row.last_state_json); } catch { previous = { endAt: activityDate(now), status: 'ended' }; }
      const state = current || previous;
      const created = new Date(row.created_at).getTime();
      const start = current?.startAt === undefined ? created : (current.startAt + 978307200) * 1000;
      const expires = Math.min(new Date(row.expires_at).getTime(), Math.max(created, start - 600_000) + ACTIVITY_MAX_AGE_MS);
      const end = !row.enabled || !row.client_active || !current || current.status === 'ended' || expires <= now;
      const checksum = activityStateHash(state, end);
      if (!end && checksum === row.last_payload_hash) {
        await pool.query(`UPDATE festival_live_activities SET next_attempt_at = ?
          WHERE id = ? AND push_token_hash = ? AND ended_at IS NULL AND last_payload_hash = ?`,
        [new Date(now + 60_000), row.id, row.push_token_hash, checksum]);
        result.skipped++; return;
      }
      const lease = randomUUID();
      const [claimed] = await pool.query<ResultSetHeader>(`UPDATE festival_live_activities SET lease_token = ?, lease_until = ?
        WHERE id = ? AND push_token_hash = ? AND ended_at IS NULL AND (lease_until IS NULL OR lease_until < ?)`,
      [lease, new Date(now + 60_000), row.id, row.push_token_hash, at]);
      if (!claimed.affectedRows) { result.skipped++; return; }
      const timestamp = Math.max(Math.floor(now / 1000), Number(row.last_sent_timestamp) + 1);
      try {
        await deliver({ pushToken: row.push_token, environment: row.environment }, festivalActivityPayload(state, timestamp, end), settings);
        await pool.query(`UPDATE festival_live_activities SET last_payload_hash = ?, last_state_json = ?, last_sent_timestamp = ?,
          failures = 0, next_attempt_at = ?, lease_token = NULL, lease_until = NULL, ended_at = ?, ended_reason = ?
          WHERE id = ? AND lease_token = ? AND push_token_hash = ?`,
        [checksum, JSON.stringify(state), timestamp, new Date(now + 60_000), end ? at : null, end ? 'ended' : null, row.id, lease, row.push_token_hash]);
        if (end) result.ended++; else result.updated++;
      } catch (error) {
        const invalid = error instanceof ActivityApnsError && error.invalidToken;
        const retry = Math.min(300_000, 15_000 * 2 ** Math.min(row.failures, 5));
        await pool.query(`UPDATE festival_live_activities SET failures = failures + 1, next_attempt_at = ?,
          lease_token = NULL, lease_until = NULL, ended_at = ?, ended_reason = ? WHERE id = ? AND lease_token = ? AND push_token_hash = ?`,
        [new Date(now + retry), invalid ? at : null, invalid ? 'invalid_token' : null, row.id, lease, row.push_token_hash]);
        if (invalid) result.invalidTokens++; else result.failed++;
      }
    }));
  }
  if (rows.length < 500 || result.deferred) break;
  }
  } finally { transport?.close(); }
  await pool.query('DELETE FROM festival_live_activities WHERE ended_at < ?', [new Date(now - 2 * 24 * 3600_000)]);
  await pool.query('DELETE FROM festival_activity_installations WHERE last_seen_at < ?', [new Date(now - 30 * 24 * 3600_000)]);
  return result;
}
