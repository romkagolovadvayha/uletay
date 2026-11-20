import './load-env';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { previewChatMessages, previewChatPeople } from './fixtures/chat-preview';

async function main() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT || 3352);
  const database = process.env.DB_NAME;
  if (database !== 'uletay_web_design' || !['127.0.0.1', 'localhost'].includes(host) || port !== 3352 || process.env.NODE_ENV === 'production') {
    throw new Error('Fictional chat is restricted to the isolated local uletay_web_design database on port 3352');
  }
  assert.equal(previewChatMessages.length, 59);
  for (const [index, message] of previewChatMessages.entries()) {
    assert.ok(previewChatPeople[message.person]);
    assert.ok(message.text.trim() && [...message.text].length <= 2000);
    if (message.replyTo) assert.ok(message.replyTo > 0 && message.replyTo <= index);
  }

  const connection = await mysql.createConnection({ host, port, database, user: process.env.DB_USER || 'root', password: process.env.DB_PASS || '', charset: 'utf8mb4' });
  try {
    const [identity] = await connection.query<RowDataPacket[]>('SELECT DATABASE() AS name');
    assert.equal(identity[0].name, 'uletay_web_design');
    await connection.beginTransaction();
    const [before] = await connection.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM chat_messages WHERE request_id LIKE 'preview-chat-v1-%'");
    const people: number[] = [];
    for (const [index, name] of previewChatPeople.entries()) {
      const [row] = await connection.execute<ResultSetHeader>(
        'INSERT INTO chat_users (vk_id,display_name,avatar_url,is_active) VALUES (?,?,?,FALSE) ON DUPLICATE KEY UPDATE avatar_url=VALUES(avatar_url),id=LAST_INSERT_ID(id)',
        [`preview-chat-${String(index + 1).padStart(2, '0')}`, name, `/chat-preview/avatars-v1.webp#avatar=${index}`],
      );
      people.push(row.insertId);
    }
    const periods = [
      { days: 30, count: 3, hour: 17 }, { days: 29, count: 2, hour: 12 },
      { days: 25, count: 8, hour: 20 }, { days: 21, count: 2, hour: 14 },
      { days: 18, count: 4, hour: 16 }, { days: 16, count: 2, hour: 9 },
      { days: 14, count: 5, hour: 18 }, { days: 12, count: 2, hour: 15 },
      { days: 10, count: 7, hour: 19 }, { days: 7, count: 5, hour: 11 },
      { days: 4, count: 5, hour: 18 }, { days: 2, count: 4, hour: 13 },
      { days: 1, count: 3, hour: 16 }, { days: 0, count: 7, hour: 0 },
    ];
    const now = Date.now();
    const timestamps: Date[] = [];
    for (const [periodIndex, period] of periods.entries()) {
      const start = new Date(now);
      start.setDate(start.getDate() - period.days);
      start.setHours(period.hour, [7, 23, 41, 12, 36, 5, 19, 48, 16, 31, 9, 43, 28][periodIndex % 13], 0, 0);
      let minute = 0;
      for (let index = 0; index < period.count; index++) {
        minute += [3, 11, 2, 19, 7, 26, 4, 13][index % 8];
        timestamps.push(period.days === 0 ? new Date(now - [182, 149, 114, 81, 39, 18, 3][index] * 60_000) : new Date(start.getTime() + minute * 60_000));
      }
    }
    assert.equal(timestamps.length, 59);
    assert.ok(timestamps.every((date, index) => date.getTime() <= now && (index === 0 || date > timestamps[index - 1])));
    const messages: number[] = [];
    for (const [index, message] of previewChatMessages.entries()) {
      const requestId = `preview-chat-v1-${String(index + 1).padStart(3, '0')}`;
      const [row] = await connection.execute<ResultSetHeader>(
        'INSERT INTO chat_messages (user_id,body,reply_to,request_id,created_at) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE body=VALUES(body),created_at=VALUES(created_at),id=LAST_INSERT_ID(id)',
        [people[message.person], message.text, message.replyTo ? messages[message.replyTo - 1] : null, requestId, timestamps[index]],
      );
      messages.push(row.insertId);
    }
    const [counts] = await connection.query<RowDataPacket[]>("SELECT COUNT(*) AS count,COUNT(DISTINCT user_id) AS people,SUM(reply_to IS NOT NULL) AS replies,COUNT(DISTINCT DATE(created_at)) AS days,MIN(created_at) AS oldest,MAX(created_at) AS newest FROM chat_messages WHERE request_id LIKE 'preview-chat-v1-%'");
    assert.equal(Number(counts[0].count), 59);
    assert.equal(Number(counts[0].people), previewChatPeople.length);
    await connection.commit();
    console.log(JSON.stringify({ database, messages: Number(counts[0].count), people: Number(counts[0].people), replies: Number(counts[0].replies), days: Number(counts[0].days), oldest: counts[0].oldest, newest: counts[0].newest, inserted: Number(counts[0].count) - Number(before[0].count), fictional: true, sourceThemes: 'https://vk.com/wall-10571147_561854' }));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Chat preview seed failed'); process.exitCode = 1; });
