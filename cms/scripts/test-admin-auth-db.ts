import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { migrateAdminAccess } from './migrations/admin-access';

async function main() {
  // This suite creates and removes a separate database; never point it at live content.
  const port = Number(process.env.TEST_DB_PORT);
  if (!Number.isInteger(port) || port < 1)
    throw new Error('Set TEST_DB_PORT for an isolated local MySQL instance.');
  const database = `uletay_test_auth_${randomBytes(6).toString('hex')}`;
  process.env.DB_HOST = '127.0.0.1';
  process.env.DB_PORT = String(port);
  process.env.DB_USER = process.env.TEST_DB_USER || 'root';
  process.env.DB_PASS = process.env.TEST_DB_PASS || '';
  process.env.DB_NAME = database;
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    port,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    multipleStatements: true,
  });
  try {
    await db.query(`CREATE DATABASE \`${database}\`; USE \`${database}\`;
      CREATE TABLE admin_users (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, username VARCHAR(64) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL);
      CREATE TABLE admin_sessions (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id INT UNSIGNED NOT NULL, token VARCHAR(128) UNIQUE NOT NULL, expires_at DATETIME NOT NULL);`);
    await db.query(
      "INSERT INTO admin_users (username, password_hash) VALUES ('existing-owner', 'unchanged-hash')",
    );
    await migrateAdminAccess(db);
    await migrateAdminAccess(db);
    const [owners] = await db.query<RowDataPacket[]>('SELECT * FROM admin_users');
    assert.equal(owners[0].role, 'owner');
    assert.equal(owners[0].password_hash, 'unchanged-hash');
    assert.equal(owners[0].is_active, 1);
    const auth = await import('../src/lib/auth');
    const access = await import('../src/lib/admin-access');
    await db.execute('UPDATE admin_users SET password_hash = ? WHERE id = 1', [
      await auth.hashPassword('isolated-test-password'),
    ]);
    assert.equal(await auth.verifyAdminCredentials('existing-owner', 'wrong'), null);
    assert.equal(await auth.verifyAdminCredentials('existing-owner', 'isolated-test-password'), 1);
    await access.grantVkAccess('12345', 'Test editor');
    const editor = await access.findAdminByVkId('12345');
    assert(editor);
    assert.equal(editor.role, 'admin');
    const token = await auth.createAdminSession(editor.id);
    assert(await auth.verifyBearerToken(`Bearer ${token}`));
    const [sessions] = await db.query<RowDataPacket[]>('SELECT token FROM admin_sessions');
    assert.notEqual(sessions[0].token, token, 'Only token digests may be stored');
    await access.revokeVkAccess(editor.id);
    assert.equal(await access.findAdminByVkId('12345'), null);
    assert.equal(await auth.verifyBearerToken(`Bearer ${token}`), false);
    await access.grantVkAccess('12345', 'Restored editor');
    assert.equal(
      await auth.verifyBearerToken(`Bearer ${token}`),
      false,
      'Restoring access must not restore old sessions',
    );
    const restored = await access.findAdminByVkId('12345');
    assert.equal(restored?.id, editor.id);
    const newToken = await auth.createAdminSession(editor.id);
    await auth.deleteAdminSession(newToken);
    assert.equal(await auth.verifyBearerToken(`Bearer ${newToken}`), false);
    await assert.rejects(access.revokeVkAccess(1));
    assert.equal(await auth.verifyAdminCredentials('vk:12345', 'isolated-test-password'), null);
    assert.equal((await access.listAdmins()).length, 2);
    console.log(
      'Admin DB: repeat migration, existing owner, passwords, VK allowlist, revocation, restored access and logout passed.',
    );
  } finally {
    const { getPool } = await import('../src/lib/db');
    await getPool().end();
    await db.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await db.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
