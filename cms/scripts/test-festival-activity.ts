import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer, connect } from 'node:http2';
import { activityDate, activityStateHash, festivalActivityStates, festivalActivityPayload, parseActivityInstallation } from '../src/lib/festival-activity-model';
import { activityApnsAuthorization, ActivityApnsError, sendFestivalActivityPush } from '../src/lib/festival-activity-apns';
import type { AppData } from '../src/types';

async function main() {
const now = Date.parse('2027-07-16T23:55:00+04:00');
const data = { stages: [{ id: 'south', name: 'Южная сцена' }], schedule: [{ id: 'one', artist: 'Артист', stageId: 'south', date: '2027-07-16', startTime: '23:50', endTime: '00:40' }], autographs: [] } as unknown as AppData;
const state = festivalActivityStates(data, now).get('perf:one')!;
assert.equal(state.status, 'live');
assert.equal(state.endAt, activityDate(Date.parse('2027-07-17T00:40:00+04:00')));
assert.equal(festivalActivityStates(data, now - 10 * 60_000).get('perf:one')!.status, 'upcoming');
assert.equal(festivalActivityStates(data, now + 3600_000).get('perf:one')!.status, 'ended');
const end = festivalActivityPayload(state, Math.floor(now / 1000), true);
assert.equal(end.aps.event, 'end'); assert.equal(end.aps['dismissal-date'], Math.floor(now / 1000));
assert.equal(end.aps['content-state'].status, 'ended');
assert.notEqual(activityStateHash(state, false), activityStateHash({ ...state, stage: 'Другая сцена' }, false));
assert.equal(activityDate(1_800_000_000_000), 821_692_800, 'Wire date must match the real Swift Codable fixture');
const registration = { installationId: '09fb3155-fc35-4ab7-bd0c-a441d045a0ac', secret: 'a'.repeat(64), revision: 1, enabled: true,
  activities: [{ activityId: 'activity-1', favoriteKey: 'perf:one', pushToken: 'b'.repeat(64), environment: 'production' }] };
assert.equal(parseActivityInstallation(registration).activities.length, 1);
for (const invalid of [null, {}, { ...registration, secret: '' }, { ...registration, revision: -1 }, { ...registration, activities: [{ ...registration.activities[0], favoriteKey: 'https://evil.test' }] }, { ...registration, activities: [registration.activities[0], registration.activities[0]] }]) {
  assert.throws(() => parseActivityInstallation(invalid));
}
const directory = await mkdtemp(path.join(tmpdir(), 'uletay-apns-test-'));
const keyPath = path.join(directory, 'test-key.p8');
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
await writeFile(keyPath, privateKey.export({ type: 'pkcs8', format: 'pem' }));
const settings = { teamId: 'TESTTEAM01', keyId: 'TESTKEY001', keyPath, bundleId: 'ru.uletay.app' };
const server = createServer();
let status = 200, reason = 'Unregistered';
const requests: { headers: Record<string, unknown>; body: typeof end }[] = [];
server.on('stream', (stream, headers) => {
  let body = ''; stream.on('data', bytes => { body += bytes; });
  stream.on('end', () => { requests.push({ headers, body: JSON.parse(body) }); stream.respond({ ':status': status }); stream.end(status === 200 ? '' : JSON.stringify({ reason })); });
});
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  const authorization = activityApnsAuthorization(settings, now);
  const [header, claims, signature] = authorization.split('.');
  assert.equal(JSON.parse(Buffer.from(header, 'base64url').toString()).alg, 'ES256');
  assert.equal(JSON.parse(Buffer.from(claims, 'base64url').toString()).iss, settings.teamId);
  assert(verify('sha256', Buffer.from(header + '.' + claims), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url')));
  const port = (server.address() as { port: number }).port;
  let requestedOrigin = '';
  const mockConnect = ((origin: string) => { requestedOrigin = origin; return connect(`http://127.0.0.1:${port}`); }) as typeof connect;
  await sendFestivalActivityPush({ pushToken: 'b'.repeat(64), environment: 'production' }, end, settings, mockConnect);
  assert.equal(requestedOrigin, 'https://api.push.apple.com');
  assert.equal(requests[0].headers['apns-topic'], 'ru.uletay.app.push-type.liveactivity');
  assert.equal(requests[0].headers['apns-priority'], '10');
  assert.equal(requests[0].headers['apns-push-type'], 'liveactivity');
  assert.equal(requests[0].headers['apns-expiration'], String(end.aps.timestamp + 4 * 3600));
  assert.deepEqual(requests[0].body, end);
  await sendFestivalActivityPush({ pushToken: 'b'.repeat(64), environment: 'sandbox' }, festivalActivityPayload(state, Math.floor(now / 1000)), settings, mockConnect);
  assert.equal(requestedOrigin, 'https://api.sandbox.push.apple.com');
  assert.equal(requests[1].headers['apns-priority'], '5');
  status = 410;
  await assert.rejects(sendFestivalActivityPush({ pushToken: 'b'.repeat(64), environment: 'production' }, end, settings, mockConnect), error => error instanceof ActivityApnsError && error.invalidToken);
  status = 429; reason = 'TooManyRequests';
  await assert.rejects(sendFestivalActivityPush({ pushToken: 'b'.repeat(64), environment: 'production' }, end, settings, mockConnect), error => error instanceof ActivityApnsError && !error.invalidToken);
  console.log('PASS: real HTTP/2 transport, P-256 JWT, production/sandbox routing, metadata/time protocol, final end, invalid token and throttling');
} finally {
  await new Promise<void>(resolve => server.close(() => resolve()));
  await unlink(keyPath); await rmdir(directory);
}
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
