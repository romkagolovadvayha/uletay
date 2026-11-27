import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import type { AppData } from '../src/types';

async function main() {
  // This test creates and drops its own database on the isolated loopback QA
  // instance. It never loads cms/.env and never contacts APNs.
  const database = 'uletay_activity_test_' + randomUUID().replaceAll('-', '');
  process.env.DB_HOST = '127.0.0.1'; process.env.DB_PORT = '3347'; process.env.DB_USER = 'root'; process.env.DB_PASS = ''; process.env.DB_NAME = database;
  process.env.FESTIVAL_ACTIVITY_APNS_ENABLED = 'true';
  process.env.FESTIVAL_ACTIVITY_APNS_TEAM_ID = 'TESTTEAM01'; process.env.FESTIVAL_ACTIVITY_APNS_KEY_ID = 'TESTKEY001'; process.env.FESTIVAL_ACTIVITY_APNS_KEY_PATH = '/test/not-a-real-key.p8';
  const root = await mysql.createConnection({ host: '127.0.0.1', port: 3347, user: 'root', password: '', multipleStatements: true });
  assert(/^uletay_activity_test_[0-9a-f]{32}$/.test(database));
  await root.query('CREATE DATABASE ' + mysql.escapeId(database) + ' CHARACTER SET utf8mb4');
  await root.changeUser({ database });
  const schema = await readFile(path.join(__dirname, 'live-activities-schema.sql'), 'utf8');
  await root.query(schema); await root.query(schema);
  await root.query('CREATE TABLE app_content (id INT PRIMARY KEY, content LONGTEXT NOT NULL)');
  const data: AppData = JSON.parse(await readFile(path.join(__dirname, '../seed/content.json'), 'utf8'));
  data.schedule = [{ ...data.schedule[0], startTime: '18:00', endTime: '19:00' }]; data.autographs = [];
  const event = data.schedule[0], key = 'perf:' + event.id;
  const startsAt = Date.parse(`${event.date}T18:00:00+04:00`), now = startsAt - 5 * 60_000;
  const save = () => {
    const artist = data.headliners.find(item => item.id === event.headlinerId);
    if (artist) artist.name = event.artist;
    return root.query('INSERT INTO app_content (id, content) VALUES (1, ?) ON DUPLICATE KEY UPDATE content = VALUES(content)', [JSON.stringify(data)]);
  };
  await save();
  const { getPool } = await import('../src/lib/db');
  const { registerFestivalActivities, sendFestivalActivityUpdates, ActivityRegistrationError } = await import('../src/lib/festival-activities');
  const { ActivityApnsError } = await import('../src/lib/festival-activity-apns');
  const registration = { installationId: randomUUID(), secret: 'a'.repeat(64), revision: 1, enabled: true,
    activities: [{ activityId: 'activity-one', favoriteKey: key, pushToken: 'b'.repeat(64), environment: 'production' }] };
  const deliveries: { event: string; state: Record<string, unknown> }[] = [];
  const sender: Parameters<typeof sendFestivalActivityUpdates>[1] = async (_target, payload) => {
    const body = payload as unknown as { aps: { event: string; 'content-state': Record<string, unknown> } };
    deliveries.push({ event: body.aps.event, state: body.aps['content-state'] });
  };
  try {
    assert.equal((await registerFestivalActivities(registration, now)).applied, true);
    assert.equal((await sendFestivalActivityUpdates(now, sender)).updated, 1);
    assert.equal(deliveries.at(-1)!.state.status, 'upcoming');
    assert.equal((await sendFestivalActivityUpdates(now + 60_000, sender)).skipped, 1, 'Unchanged cards must not generate repeated pushes');
    assert.equal((await sendFestivalActivityUpdates(startsAt, sender)).updated, 1);
    assert.equal(deliveries.at(-1)!.state.status, 'live');
    event.artist = 'Изменённый артист'; event.endTime = '20:00'; await save();
    assert.equal((await sendFestivalActivityUpdates(startsAt + 60_000, sender)).updated, 1);
    assert.equal(deliveries.at(-1)!.state.artist, event.artist);
    assert.equal(deliveries.at(-1)!.state.timeLabel, '18:00–20:00');

    event.artist = 'Проверка параллельной отправки'; await save();
    let release!: () => void, entered!: () => void;
    const enteredPromise = new Promise<void>(resolve => { entered = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    const first = sendFestivalActivityUpdates(startsAt + 120_000, async (...args) => { entered(); await gate; await sender!(...args); });
    await enteredPromise;
    const second = await sendFestivalActivityUpdates(startsAt + 120_000, sender);
    assert.equal(second.updated + second.ended, 0, 'A second worker must not duplicate a leased delivery');
    release(); assert.equal((await first).updated, 1);

    event.artist = 'Повтор после ограничения APNs'; await save();
    assert.equal((await sendFestivalActivityUpdates(startsAt + 180_000, async () => { throw new ActivityApnsError(429, 'TooManyRequests'); })).failed, 1);
    assert.equal((await sendFestivalActivityUpdates(startsAt + 181_000, sender)).checked, 0, 'Backoff must suppress immediate retries');
    assert.equal((await sendFestivalActivityUpdates(startsAt + 196_000, sender)).updated, 1);

    await assert.rejects(registerFestivalActivities({ ...registration, secret: 'c'.repeat(64), revision: 2 }, now), e => e instanceof ActivityRegistrationError && e.status === 403);
    await registerFestivalActivities({ ...registration, enabled: false, activities: [], revision: 3 }, startsAt + 200_000);
    assert.equal((await registerFestivalActivities({ ...registration, revision: 2 }, startsAt + 201_000)).applied, false, 'A delayed registration must not undo opt-out');
    assert.equal((await sendFestivalActivityUpdates(startsAt + 202_000, sender)).ended, 1);
    assert.equal(deliveries.at(-1)!.event, 'end');

    const other = { ...registration, installationId: randomUUID(), activities: [{ ...registration.activities[0], activityId: 'activity-other', pushToken: 'd'.repeat(64) }] };
    await registerFestivalActivities(other, startsAt + 210_000);
    assert.equal((await sendFestivalActivityUpdates(startsAt + 211_000, sender)).updated, 1);
    event.artist = 'Недействительный токен'; await save();
    assert.equal((await sendFestivalActivityUpdates(startsAt + 280_000, async () => { throw new ActivityApnsError(410, 'Unregistered'); })).invalidTokens, 1);
    assert.equal((await sendFestivalActivityUpdates(startsAt + 281_000, sender)).checked, 0);
    await registerFestivalActivities({ ...other, revision: 2, activities: [{ ...other.activities[0], pushToken: '4'.repeat(64) }] }, startsAt + 282_000);
    assert.equal((await sendFestivalActivityUpdates(startsAt + 283_000, sender)).updated, 1, 'A rotated valid token must recover from a rejected old token');
    await registerFestivalActivities({ ...other, revision: 3, enabled: false, activities: [] }, startsAt + 284_000);
    assert.equal((await sendFestivalActivityUpdates(startsAt + 285_000, sender)).ended, 1);

    const deleted = { ...registration, installationId: randomUUID(), activities: [{ ...registration.activities[0], activityId: 'activity-deleted', pushToken: 'e'.repeat(64) }] };
    await registerFestivalActivities(deleted, startsAt + 300_000);
    await sendFestivalActivityUpdates(startsAt + 301_000, sender);
    data.schedule = []; await save();
    assert.equal((await sendFestivalActivityUpdates(startsAt + 370_000, sender)).ended, 1, 'Deleting an event must close its card');

    data.schedule = [event]; await save();
    const finished = { ...registration, installationId: randomUUID(), activities: [{ ...registration.activities[0], activityId: 'activity-finished', pushToken: 'f'.repeat(64) }] };
    await registerFestivalActivities(finished, startsAt + 400_000);
    await sendFestivalActivityUpdates(startsAt + 401_000, sender);
    assert.equal((await sendFestivalActivityUpdates(startsAt + 2 * 3600_000, sender)).ended, 1, 'The server must end the card without an app callback');
    assert.equal(deliveries.at(-1)!.state.status, 'ended');

    const pending = { ...registration, installationId: randomUUID(), activities: [{ ...registration.activities[0], activityId: 'activity-pending', pushToken: '5'.repeat(64) }] };
    await registerFestivalActivities(pending, startsAt - 20 * 3600_000);
    assert.equal((await sendFestivalActivityUpdates(startsAt - 12 * 3600_000, sender)).updated, 1, 'A scheduled future card must not expire eight hours after early registration');
    await registerFestivalActivities({ ...pending, revision: 2, enabled: false, activities: [] }, startsAt - 12 * 3600_000 + 1000);
    await sendFestivalActivityUpdates(startsAt - 12 * 3600_000 + 2000, sender);

    event.endTime = '17:00'; await save(); // Long performance ends the following day.
    const lifetime = { ...registration, installationId: randomUUID(), activities: [{ ...registration.activities[0], activityId: 'activity-lifetime', pushToken: '6'.repeat(64) }] };
    await registerFestivalActivities(lifetime, now);
    assert.equal((await sendFestivalActivityUpdates(startsAt + 8 * 3600_000, sender)).ended, 1, 'The server must bound an activity to the OS running lifetime');
    event.endTime = '20:00'; await save();

    const { POST } = await import('../src/app/api/live-activities/route');
    const { NextRequest } = await import('next/server');
    const request = (body: unknown) => new NextRequest('http://127.0.0.1/api/live-activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const httpRegistration = { ...registration, installationId: randomUUID(), activities: [{ ...registration.activities[0], activityId: 'http-activity', pushToken: '1'.repeat(64) }] };
    assert.equal((await POST(request(httpRegistration))).status, 200);
    assert.equal((await POST(request({ ...httpRegistration, secret: '2'.repeat(64), revision: 2 }))).status, 403);
    assert.equal((await POST(request({ invalid: true }))).status, 400);
    assert.equal((await POST(request({ huge: 'x'.repeat(20_000) }))).status, 413);

    process.env.FESTIVAL_ACTIVITY_APNS_ENABLED = 'false';
    assert.equal((await sendFestivalActivityUpdates()).configured, false, 'Disabled APNs must preserve pre-migration compatibility');
    assert.equal((await POST(request(httpRegistration))).status, 503);
    console.log('PASS: real MySQL migration/idempotency, registration ownership, revision replay, state changes, duplicate workers, backoff, invalid token, opt-out, event deletion, background completion and real Next route validation');
  } finally {
    await getPool().end();
    await root.query('DROP DATABASE ' + mysql.escapeId(database)); await root.end();
  }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
