import { createHash } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import webpush from 'web-push';
import { config } from './config';
import { getPool } from './db';

export type PushAudience = 'all' | 'native' | 'web';
export type PushPlatform = 'ios' | 'android' | 'web';

export type PushBroadcastInput = {
  title: string;
  body: string;
  targetPath: string;
  audience: PushAudience;
};

export type PushSendResult = {
  nativeAccepted: number;
  nativeFailed: number;
  webSent: number;
  webFailed: number;
  errors: string[];
};

export type PushStats = {
  ios: number;
  android: number;
  web: number;
};

export type PushBroadcastHistoryItem = PushSendResult & {
  id: number;
  title: string;
  body: string;
  targetPath: string;
  audience: PushAudience;
  createdAt: string;
};

type ExpoSubscriptionRow = RowDataPacket & {
  id: number;
  expo_token: string;
};

type RuStoreSubscriptionRow = RowDataPacket & {
  id: number;
  push_token: string;
};

type RuStoreApiError = {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

export type WebSubscriptionRow = RowDataPacket & {
  id: number;
  endpoint: string;
  p256dh: string;
  auth_secret: string;
};

export type WebPushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
  ttlSeconds?: number;
};

type ExpoTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

const EXPO_TOKEN_RE = /^(Exponent|Expo)PushToken\[[A-Za-z0-9_-]+\]$/;
const RUSTORE_TOKEN_MAX_LENGTH = 4096;
const FAVORITE_KEY_RE = /^(?:perf|auto|food):[^\u0000-\u0020\u007f]{1,220}$/;
const SAFE_PATHS = [
  /^\/$/,
  /^\/map(?:\/[^/?#]+)?$/,
  /^\/schedule(?:\/(?:live|full)(?:\/[^/?#]+)?)?$/,
  /^\/autographs(?:\/[^/?#]+)?$/,
  /^\/favorites$/,
  /^\/playlist$/,
  /^\/headliners(?:\/[^/?#]+)?$/,
  /^\/foodcourt(?:\/[^/?#]+)?$/,
  /^\/(?:about|rules|settings|legal)$/,
];

function endpointHash(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex');
}

function rustoreTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function normalizeRuStoreToken(value: unknown): string {
  const token = String(value ?? '').trim();
  if (
    token.length < 16 ||
    token.length > RUSTORE_TOKEN_MAX_LENGTH ||
    /[\u0000-\u0020\u007f]/.test(token)
  ) {
    throw new Error('Некорректный RuStore push token');
  }
  return token;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeFavoriteKeys(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.length > 500) {
    throw new Error('Некорректный список избранного');
  }
  const keys = [...new Set(value.map((item) => String(item).trim()))];
  if (keys.some((key) => !FAVORITE_KEY_RE.test(key))) {
    throw new Error('Некорректный ключ избранного');
  }
  return keys.filter((key) => key.startsWith('perf:') || key.startsWith('auto:'));
}

export function normalizePushPath(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > 255 || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) {
    throw new Error('Некорректный путь перехода');
  }

  let decodedPath: string;
  try {
    const parsed = new URL(raw, 'https://uletay.local');
    if (parsed.origin !== 'https://uletay.local') {
      throw new Error('external');
    }
    decodedPath = decodeURIComponent(parsed.pathname);
  } catch {
    throw new Error('Некорректный путь перехода');
  }

  if (!SAFE_PATHS.some((pattern) => pattern.test(decodedPath))) {
    throw new Error('Этот путь не относится к экрану приложения');
  }
  return raw;
}

export function validatePushBroadcast(input: PushBroadcastInput): PushBroadcastInput {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || title.length > 120) {
    throw new Error('Заголовок обязателен и должен быть не длиннее 120 символов');
  }
  if (!body || body.length > 500) {
    throw new Error('Текст обязателен и должен быть не длиннее 500 символов');
  }
  if (!['all', 'native', 'web'].includes(input.audience)) {
    throw new Error('Некорректная аудитория');
  }
  return {
    title,
    body,
    targetPath: normalizePushPath(input.targetPath),
    audience: input.audience,
  };
}

export async function registerExpoPushToken(
  token: string,
  platform: Exclude<PushPlatform, 'web'>,
  userAgent?: string,
): Promise<void> {
  if (!EXPO_TOKEN_RE.test(token) || !['ios', 'android'].includes(platform)) {
    throw new Error('Некорректный Expo push token');
  }
  await getPool().query(
    `INSERT INTO push_subscriptions
      (platform, expo_token, user_agent, active, last_seen_at)
     VALUES (?, ?, ?, TRUE, NOW())
     ON DUPLICATE KEY UPDATE
       platform = VALUES(platform),
       user_agent = VALUES(user_agent),
       active = TRUE,
       last_seen_at = NOW()`,
    [platform, token, userAgent?.slice(0, 255) || null],
  );
}

export async function registerRuStorePushToken(
  rawToken: string,
  userAgent?: string,
): Promise<void> {
  const token = normalizeRuStoreToken(rawToken);
  await getPool().query(
    `INSERT INTO push_rustore_subscriptions
      (push_token, token_hash, user_agent, active, last_seen_at)
     VALUES (?, ?, ?, TRUE, NOW())
     ON DUPLICATE KEY UPDATE
       push_token = VALUES(push_token),
       user_agent = VALUES(user_agent),
       active = TRUE,
       last_seen_at = NOW()`,
    [token, rustoreTokenHash(token), userAgent?.slice(0, 255) || null],
  );
}

export async function registerWebPushSubscription(
  subscription: {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  },
  userAgent?: string,
  rawFavoriteKeys?: unknown,
): Promise<void> {
  const endpoint = String(subscription.endpoint ?? '');
  const p256dh = String(subscription.keys?.p256dh ?? '');
  const auth = String(subscription.keys?.auth ?? '');
  if (
    !endpoint.startsWith('https://') ||
    endpoint.length > 4096 ||
    !/^[A-Za-z0-9_-]{40,200}$/.test(p256dh) ||
    !/^[A-Za-z0-9_-]{10,100}$/.test(auth)
  ) {
    throw new Error('Некорректная web push подписка');
  }
  const favoriteKeys = normalizeFavoriteKeys(rawFavoriteKeys);
  const pool = getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO push_subscriptions
        (platform, endpoint, endpoint_hash, p256dh, auth_secret, user_agent, active, last_seen_at)
       VALUES ('web', ?, ?, ?, ?, ?, TRUE, NOW())
       ON DUPLICATE KEY UPDATE
         endpoint = VALUES(endpoint),
         p256dh = VALUES(p256dh),
         auth_secret = VALUES(auth_secret),
         user_agent = VALUES(user_agent),
         active = TRUE,
         last_seen_at = NOW()`,
      [endpoint, endpointHash(endpoint), p256dh, auth, userAgent?.slice(0, 255) || null],
    );

    if (favoriteKeys !== undefined) {
      const [rows] = await connection.query<(RowDataPacket & { id: number })[]>(
        'SELECT id FROM push_subscriptions WHERE endpoint_hash = ? LIMIT 1',
        [endpointHash(endpoint)],
      );
      const subscriptionId = Number(rows[0]?.id);
      if (!subscriptionId) {
        throw new Error('Не удалось сохранить web push подписку');
      }
      await connection.query(
        'DELETE FROM push_subscription_favorites WHERE subscription_id = ?',
        [subscriptionId],
      );
      if (favoriteKeys.length) {
        await connection.query(
          `INSERT INTO push_subscription_favorites (subscription_id, favorite_key)
           VALUES ${favoriteKeys.map(() => '(?, ?)').join(', ')}`,
          favoriteKeys.flatMap((key) => [subscriptionId, key]),
        );
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function unregisterPushSubscription(input: {
  token?: unknown;
  endpoint?: unknown;
  provider?: unknown;
}): Promise<void> {
  const token = String(input.token ?? '');
  const endpoint = String(input.endpoint ?? '');
  const provider = String(input.provider ?? '');
  if (provider === 'rustore' && token) {
    const normalizedToken = normalizeRuStoreToken(token);
    await getPool().query(
      'UPDATE push_rustore_subscriptions SET active = FALSE WHERE token_hash = ?',
      [rustoreTokenHash(normalizedToken)],
    );
    return;
  }
  if (token && EXPO_TOKEN_RE.test(token)) {
    await getPool().query('UPDATE push_subscriptions SET active = FALSE WHERE expo_token = ?', [token]);
    return;
  }
  if (endpoint.startsWith('https://')) {
    await getPool().query(
      `DELETE favorites
       FROM push_subscription_favorites favorites
       INNER JOIN push_subscriptions subscriptions
         ON subscriptions.id = favorites.subscription_id
       WHERE subscriptions.endpoint_hash = ?`,
      [endpointHash(endpoint)],
    );
    await getPool().query(
      'UPDATE push_subscriptions SET active = FALSE WHERE endpoint_hash = ?',
      [endpointHash(endpoint)],
    );
  }
}

async function rustoreFetch(
  token: string,
  input: PushBroadcastInput,
): Promise<{ invalid: boolean; error?: string }> {
  const projectId = config.rustorePushProjectId;
  const serviceToken = config.rustorePushServiceToken;
  if (!projectId || !serviceToken) {
    throw new Error('Не настроены RUSTORE_PUSH_PROJECT_ID и RUSTORE_PUSH_SERVICE_TOKEN');
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(
        `https://vkpns.rustore.ru/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${serviceToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token,
              data: { url: input.targetPath },
              notification: {
                title: input.title,
                body: input.body,
              },
              android: {
                notification: {
                  title: input.title,
                  body: input.body,
                  channel_id: 'broadcasts',
                  click_action: `uletay://${input.targetPath}`,
                  click_action_type: 1,
                },
              },
            },
          }),
        },
      );

      if (response.ok) {
        return { invalid: false };
      }

      const payload = (await response.json().catch(() => null)) as RuStoreApiError | null;
      const status = payload?.error?.status || `HTTP_${response.status}`;
      const message = payload?.error?.message || `RuStore Push HTTP ${response.status}`;
      const invalid =
        status === 'NOT_FOUND' ||
        status === 'UNREGISTERED' ||
        (status === 'INVALID_ARGUMENT' && /(?:registration|push[ -]?token)/i.test(message));

      if (invalid || (response.status !== 429 && response.status < 500)) {
        return { invalid, error: `${status}: ${message}` };
      }
      lastError = new Error(`${status}: ${message}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }

  throw lastError ?? new Error('RuStore Push недоступен');
}

async function expoFetch(messages: unknown[]): Promise<ExpoTicket[]> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (config.expoPushAccessToken) {
    headers.Authorization = `Bearer ${config.expoPushAccessToken}`;
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers,
        body: JSON.stringify(messages),
      });
      if (!response.ok) {
        const message = `Expo Push HTTP ${response.status}`;
        if (response.status !== 429 && response.status < 500) {
          throw new Error(message);
        }
        lastError = new Error(message);
      } else {
        const payload = (await response.json()) as { data?: ExpoTicket[]; errors?: { message?: string }[] };
        if (payload.errors?.length) {
          throw new Error(payload.errors.map((item) => item.message).filter(Boolean).join('; '));
        }
        return Array.isArray(payload.data) ? payload.data : [];
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw lastError ?? new Error('Expo Push недоступен');
}

async function sendExpoNative(input: PushBroadcastInput): Promise<Pick<PushSendResult, 'nativeAccepted' | 'nativeFailed' | 'errors'>> {
  const [rows] = await getPool().query<ExpoSubscriptionRow[]>(
    `SELECT id, expo_token
     FROM push_subscriptions
     WHERE active = TRUE AND platform IN ('ios', 'android') AND expo_token IS NOT NULL`,
  );
  let nativeAccepted = 0;
  let nativeFailed = 0;
  const errors: string[] = [];

  for (const batch of chunk(rows, 100)) {
    try {
      const tickets = await expoFetch(
        batch.map((row) => ({
          to: row.expo_token,
          title: input.title,
          body: input.body,
          sound: 'default',
          priority: 'high',
          channelId: 'broadcasts',
          data: { url: input.targetPath },
        })),
      );
      const invalidIds: number[] = [];
      batch.forEach((row, index) => {
        const ticket = tickets[index];
        if (ticket?.status === 'ok') {
          nativeAccepted += 1;
        } else {
          nativeFailed += 1;
          if (ticket?.details?.error === 'DeviceNotRegistered') {
            invalidIds.push(row.id);
          }
          if (ticket?.message) {
            errors.push(ticket.message);
          }
        }
      });
      if (invalidIds.length) {
        await getPool().query(
          `UPDATE push_subscriptions SET active = FALSE WHERE id IN (${invalidIds.map(() => '?').join(',')})`,
          invalidIds,
        );
      }
    } catch (error) {
      nativeFailed += batch.length;
      errors.push(errorMessage(error));
    }
  }
  return { nativeAccepted, nativeFailed, errors };
}

async function sendRuStoreNative(input: PushBroadcastInput): Promise<Pick<PushSendResult, 'nativeAccepted' | 'nativeFailed' | 'errors'>> {
  const [rows] = await getPool().query<RuStoreSubscriptionRow[]>(
    `SELECT id, push_token
     FROM push_rustore_subscriptions
     WHERE active = TRUE`,
  );
  if (!rows.length) {
    return { nativeAccepted: 0, nativeFailed: 0, errors: [] };
  }
  if (!config.rustorePushProjectId || !config.rustorePushServiceToken) {
    return {
      nativeAccepted: 0,
      nativeFailed: rows.length,
      errors: ['Не настроены RUSTORE_PUSH_PROJECT_ID и RUSTORE_PUSH_SERVICE_TOKEN'],
    };
  }

  let nativeAccepted = 0;
  let nativeFailed = 0;
  const errors: string[] = [];

  for (const batch of chunk(rows, 20)) {
    const results = await Promise.allSettled(
      batch.map((row) => rustoreFetch(row.push_token, input)),
    );
    const invalidIds: number[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && !result.value.error) {
        nativeAccepted += 1;
        return;
      }
      nativeFailed += 1;
      if (result.status === 'fulfilled') {
        if (result.value.invalid) {
          invalidIds.push(batch[index].id);
        }
        if (result.value.error) {
          errors.push(result.value.error);
        }
      } else {
        errors.push(errorMessage(result.reason));
      }
    });
    if (invalidIds.length) {
      await getPool().query(
        `UPDATE push_rustore_subscriptions SET active = FALSE WHERE id IN (${invalidIds.map(() => '?').join(',')})`,
        invalidIds,
      );
    }
  }

  return { nativeAccepted, nativeFailed, errors };
}

async function sendNative(input: PushBroadcastInput): Promise<Pick<PushSendResult, 'nativeAccepted' | 'nativeFailed' | 'errors'>> {
  const [expo, rustore] = await Promise.all([
    sendExpoNative(input),
    sendRuStoreNative(input),
  ]);
  return {
    nativeAccepted: expo.nativeAccepted + rustore.nativeAccepted,
    nativeFailed: expo.nativeFailed + rustore.nativeFailed,
    errors: [...expo.errors, ...rustore.errors],
  };
}

async function sendWeb(input: PushBroadcastInput): Promise<Pick<PushSendResult, 'webSent' | 'webFailed' | 'errors'>> {
  const [rows] = await getPool().query<WebSubscriptionRow[]>(
    `SELECT id, endpoint, p256dh, auth_secret
     FROM push_subscriptions
     WHERE active = TRUE AND platform = 'web' AND endpoint IS NOT NULL`,
  );
  if (!rows.length) {
    return { webSent: 0, webFailed: 0, errors: [] };
  }
  if (!config.vapidPublicKey || !config.vapidPrivateKey) {
    return {
      webSent: 0,
      webFailed: rows.length,
      errors: ['Не настроены VAPID_PUBLIC_KEY и VAPID_PRIVATE_KEY'],
    };
  }

  let webSent = 0;
  let webFailed = 0;
  const errors: string[] = [];

  for (const batch of chunk(rows, 25)) {
    const results = await Promise.allSettled(
      batch.map((row) =>
        sendWebPushToSubscription(row, {
          title: input.title,
          body: input.body,
          url: input.targetPath,
        }),
      ),
    );
    const invalidIds: number[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        webSent += 1;
        return;
      }
      webFailed += 1;
      const statusCode = (result.reason as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        invalidIds.push(batch[index].id);
      } else {
        errors.push(errorMessage(result.reason));
      }
    });
    if (invalidIds.length) {
      await getPool().query(
        `UPDATE push_subscriptions SET active = FALSE WHERE id IN (${invalidIds.map(() => '?').join(',')})`,
        invalidIds,
      );
    }
  }
  return { webSent, webFailed, errors };
}

export async function sendWebPushToSubscription(
  subscription: WebSubscriptionRow,
  payload: WebPushPayload,
): Promise<void> {
  if (!config.vapidPublicKey || !config.vapidPrivateKey) {
    throw new Error('Не настроены VAPID_PUBLIC_KEY и VAPID_PRIVATE_KEY');
  }
  webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey);
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth_secret },
    },
    JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: normalizePushPath(payload.url),
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: payload.tag,
    }),
    { TTL: payload.ttlSeconds ?? 86_400, urgency: 'high' },
  );
}

export async function sendPushBroadcast(
  rawInput: PushBroadcastInput,
  adminUserId: number,
): Promise<PushSendResult> {
  const input = validatePushBroadcast(rawInput);
  const result: PushSendResult = {
    nativeAccepted: 0,
    nativeFailed: 0,
    webSent: 0,
    webFailed: 0,
    errors: [],
  };

  if (input.audience !== 'web') {
    const native = await sendNative(input);
    result.nativeAccepted = native.nativeAccepted;
    result.nativeFailed = native.nativeFailed;
    result.errors.push(...native.errors);
  }
  if (input.audience !== 'native') {
    const web = await sendWeb(input);
    result.webSent = web.webSent;
    result.webFailed = web.webFailed;
    result.errors.push(...web.errors);
  }

  const uniqueErrors = [...new Set(result.errors)].slice(0, 5);
  result.errors = uniqueErrors;
  await getPool().query(
    `INSERT INTO push_broadcasts
      (title, body, target_path, audience, native_accepted, native_failed, web_sent, web_failed, error_message, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.title,
      input.body,
      input.targetPath,
      input.audience,
      result.nativeAccepted,
      result.nativeFailed,
      result.webSent,
      result.webFailed,
      uniqueErrors.join('; ').slice(0, 1000) || null,
      adminUserId,
    ],
  );
  return result;
}

export async function getPushStats(): Promise<PushStats> {
  const [[rows], [rustoreRows]] = await Promise.all([
    getPool().query<(RowDataPacket & { platform: PushPlatform; total: number })[]>(
      `SELECT platform, COUNT(*) AS total
       FROM push_subscriptions
       WHERE active = TRUE
       GROUP BY platform`,
    ),
    getPool().query<(RowDataPacket & { total: number })[]>(
      'SELECT COUNT(*) AS total FROM push_rustore_subscriptions WHERE active = TRUE',
    ),
  ]);
  const stats: PushStats = { ios: 0, android: 0, web: 0 };
  for (const row of rows) {
    stats[row.platform] = Number(row.total);
  }
  stats.android += Number(rustoreRows[0]?.total || 0);
  return stats;
}

export async function getPushBroadcastHistory(limit = 20): Promise<PushBroadcastHistoryItem[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const [rows] = await getPool().query<
    (RowDataPacket & {
      id: number;
      title: string;
      body: string;
      target_path: string;
      audience: PushAudience;
      native_accepted: number;
      native_failed: number;
      web_sent: number;
      web_failed: number;
      error_message: string | null;
      created_at: Date;
    })[]
  >(
    `SELECT id, title, body, target_path, audience, native_accepted, native_failed,
            web_sent, web_failed, error_message, created_at
     FROM push_broadcasts
     ORDER BY id DESC
     LIMIT ${safeLimit}`,
  );
  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    body: row.body,
    targetPath: row.target_path,
    audience: row.audience,
    nativeAccepted: Number(row.native_accepted),
    nativeFailed: Number(row.native_failed),
    webSent: Number(row.web_sent),
    webFailed: Number(row.web_failed),
    errors: row.error_message ? [row.error_message] : [],
    createdAt: row.created_at.toISOString(),
  }));
}
