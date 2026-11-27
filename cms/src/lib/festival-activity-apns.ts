import { readFileSync } from 'node:fs';
import { createHash, createPrivateKey, sign } from 'node:crypto';
import { connect, constants, type ClientHttp2Session, type ClientHttp2Stream } from 'node:http2';
import type { ActivityRegistration } from './festival-activity-model';

export type ActivityApnsConfig = { teamId: string; keyId: string; keyPath: string; bundleId: string };
export function activityApnsConfig(): ActivityApnsConfig | null {
  if (process.env.FESTIVAL_ACTIVITY_APNS_ENABLED !== 'true') return null;
  const settings = { teamId: process.env.FESTIVAL_ACTIVITY_APNS_TEAM_ID || '', keyId: process.env.FESTIVAL_ACTIVITY_APNS_KEY_ID || '', keyPath: process.env.FESTIVAL_ACTIVITY_APNS_KEY_PATH || '', bundleId: 'ru.uletay.app' };
  if (!/^[A-Z0-9]{10}$/.test(settings.teamId) || !/^[A-Z0-9]{10}$/.test(settings.keyId) || !settings.keyPath) throw Error('Live Activity APNs credentials are not configured');
  return settings;
}
export class ActivityApnsError extends Error {
  constructor(public status: number, public reason: string) { super(`ActivityKit APNs ${status}: ${reason}`); }
  get invalidToken() { return this.status === 410 || this.status === 400 && ['BadDeviceToken', 'DeviceTokenNotForTopic', 'Unregistered'].includes(this.reason); }
}
let cached: { signature: string; token: string; expires: number } | undefined;
export function activityApnsAuthorization(settings: ActivityApnsConfig, now = Date.now()) {
  const signature = `${settings.teamId}:${settings.keyId}:${settings.keyPath}`;
  if (cached?.signature === signature && cached.expires > now) return cached.token;
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const message = encode({ alg: 'ES256', kid: settings.keyId }) + '.' + encode({ iss: settings.teamId, iat: Math.floor(now / 1000) });
  const key = createPrivateKey(readFileSync(settings.keyPath));
  if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') throw Error('APNs requires a P-256 signing key');
  const token = message + '.' + sign('sha256', Buffer.from(message), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  cached = { signature, token, expires: now + 40 * 60_000 }; return token;
}

export async function sendFestivalActivityPush(registration: Pick<ActivityRegistration, 'pushToken' | 'environment'>, payload: { aps: { event: string; timestamp: number } }, settings: ActivityApnsConfig, openConnection: typeof connect = connect, sharedClient?: ClientHttp2Session) {
  const authorization = activityApnsAuthorization(settings);
  const client = sharedClient || openConnection(registration.environment === 'sandbox' ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com');
  try {
    await new Promise<void>((resolve, reject) => {
      let request: ClientHttp2Stream;
      const timer = setTimeout(() => { request?.close(constants.NGHTTP2_CANCEL); finish(new ActivityApnsError(0, 'Timeout')); }, 10_000);
      const onError = () => finish(new ActivityApnsError(0, 'ConnectionError'));
      const finish = (error?: Error) => { clearTimeout(timer); client.removeListener('error', onError); if (error) reject(error); else resolve(); };
      client.once('error', onError);
      request = client.request({ ':method': 'POST', ':path': '/3/device/' + registration.pushToken,
        authorization: 'bearer ' + authorization, 'apns-topic': settings.bundleId + '.push-type.liveactivity',
        'apns-push-type': 'liveactivity', 'apns-priority': payload.aps.event === 'end' ? '10' : '5',
        'apns-collapse-id': createHash('sha256').update(registration.pushToken).digest('hex'),
        'apns-expiration': String(payload.aps.timestamp + (payload.aps.event === 'end' ? 4 * 3600 : 60)) });
      let status = 0, body = '';
      request.on('response', headers => { status = Number(headers[':status']); });
      request.setEncoding('utf8'); request.on('data', chunk => { if (body.length < 4096) body += chunk; });
      request.once('error', () => finish(new ActivityApnsError(0, 'StreamError')));
      request.once('end', () => {
        if (status === 200) return finish();
        let reason = 'Rejected'; try { reason = JSON.parse(body).reason || reason; } catch { /* No token or raw response in logs. */ }
        finish(new ActivityApnsError(status, /^[A-Za-z0-9_]{1,80}$/.test(reason) ? reason : 'Rejected'));
      });
      request.end(JSON.stringify(payload));
    });
  } finally { if (!sharedClient) client.destroy(); }
}

export function createFestivalActivitySender() {
  const sessions = new Map<string, ClientHttp2Session>();
  const send: typeof sendFestivalActivityPush = async (registration, payload, settings) => {
    const origin = registration.environment === 'sandbox' ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com';
    let session = sessions.get(origin);
    if (!session || session.destroyed || session.closed) {
      session = connect(origin); session.setMaxListeners(32);
      session.on('error', () => { /* Individual streams report a bounded error. */ });
      session.setTimeout(15_000, () => session?.destroy());
      sessions.set(origin, session);
    }
    await sendFestivalActivityPush(registration, payload, settings, connect, session);
  };
  return { send, close() { for (const session of sessions.values()) session.destroy(); } };
}
