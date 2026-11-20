import '../load-env';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';
import { sealData } from 'iron-session';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { config } from '../../src/lib/config';
import { getPool } from '../../src/lib/db';
import { createAdminSession } from '../../src/lib/auth';
import { sessionOptions } from '../../src/lib/session';
import { getAppData, saveAppData } from '../../src/lib/app-data';

const filename = join(tmpdir(), 'uletay-announcement-admin-qa.json');
async function main() {
  assert.equal(config.dbPort, 3352); assert.equal(config.dbName, 'uletay_web_design');
  const pool = getPool();
  try {
    if (process.argv.includes('--cleanup')) {
      const state = JSON.parse(await readFile(filename, 'utf8'));
      assert(String(state.username).startsWith('qa-announcement-'));
      assert(String(state.artistId).startsWith('qa-announcement-'));
      const data = await getAppData();
      data.headliners = data.headliners.filter(item => item.id !== state.artistId);
      await saveAppData(data);
      await pool.execute('DELETE FROM push_broadcasts WHERE created_by=?', [state.adminId]);
      await pool.execute('DELETE FROM admin_users WHERE id=? AND username=?', [state.adminId, state.username]);
      await unlink(filename);
      console.log('Announcement QA artist, broadcasts, admin, sessions and credential file removed.');
      return;
    }
    for (const table of ['push_subscriptions', 'push_rustore_subscriptions']) {
      const [rows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ${table} WHERE active=TRUE`);
      assert.equal(Number(rows[0].total), 0, 'UI tests must never notify real subscriptions');
    }
    const key = randomBytes(6).toString('hex');
    const username = `qa-announcement-${key}`, password = randomBytes(24).toString('base64url');
    const [insert] = await pool.execute<ResultSetHeader>(
      "INSERT INTO admin_users(username,password_hash,display_name,role,is_active) VALUES (?,?,?,'admin',TRUE)",
      [username, await bcrypt.hash(password, 10), 'Проверка анонса артиста'],
    );
    const adminId = insert.insertId;
    const sessionToken = await createAdminSession(adminId);
    const cookie = await sealData({adminUserId: adminId, sessionToken}, {password: sessionOptions.password, ttl: 3600});
    const data = await getAppData(), artistId = `qa-announcement-${key}`;
    data.headliners.push({id: artistId, name: 'Проверка анонса · QA', description: 'Временная карточка для проверки кнопки', years: [2026], genres: ['Рок'], imageTint: '#45092a'});
    await saveAppData(data);
    await writeFile(filename, JSON.stringify({username,password,cookie,adminId,artistId,year:data.festival.year}), {mode:0o600});
    console.log(JSON.stringify({fixtureFile:filename,artistId,subscriptions:0}));
  } finally { await pool.end(); }
}
main().catch(error => { console.error(error); process.exitCode=1; });
