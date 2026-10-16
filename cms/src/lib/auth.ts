import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { RowDataPacket } from 'mysql2';
import { getPool } from './db';
import { config } from './config';
import { consumeRateLimit } from './rate-limit';

export async function verifyAdminCredentials(
  username: string,
  password: string,
  source = 'direct',
): Promise<number | null> {
  consumeRateLimit('login-source', source, 30, 15 * 60_000);
  consumeRateLimit('login-account', username.trim().toLowerCase(), 10, 15 * 60_000);
  if (!username || username.length > 64 || !password || password.length > 256) return null;
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, password_hash FROM admin_users WHERE username = ? AND is_active = TRUE AND vk_id IS NULL LIMIT 1',
    [username],
  );

  const user = rows[0];
  if (!user) {
    return null;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  return valid ? user.id : null;
}

export async function createAdminSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const pool = getPool();
  await pool.query('DELETE FROM admin_sessions WHERE expires_at < NOW()');
  const [result] = await pool.query<import('mysql2').ResultSetHeader>(
    `INSERT INTO admin_sessions (user_id, token, expires_at)
     SELECT id, ?, DATE_ADD(NOW(), INTERVAL 7 DAY) FROM admin_users WHERE id = ? AND is_active = TRUE`,
    ['sha256:' + createHash('sha256').update(token).digest('hex'), userId],
  );
  if (!result.affectedRows) throw new Error('Unauthorized');
  return token;
}

export async function verifyBearerToken(authHeader: string | null): Promise<boolean> {
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    return false;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  const digest = 'sha256:' + createHash('sha256').update(token).digest('hex');
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.id, s.token FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
     WHERE s.token IN (?, ?) AND s.expires_at > NOW() AND u.is_active = TRUE LIMIT 1`,
    [digest, token],
  );
  if (rows[0]?.token === token) {
    await pool.query('UPDATE admin_sessions SET token = ? WHERE id = ? AND token = ?', [
      digest,
      rows[0].id,
      token,
    ]);
  }
  return rows.length > 0;
}

export async function deleteAdminSession(token: string): Promise<void> {
  await getPool().execute('DELETE FROM admin_sessions WHERE token = ?', [
    'sha256:' + createHash('sha256').update(token).digest('hex'),
  ]);
}

export async function loginWithCredentials(
  username: string,
  password: string,
  source = 'direct',
): Promise<string | null> {
  const userId = await verifyAdminCredentials(username, password, source);
  if (!userId) {
    return null;
  }
  return createAdminSession(userId);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export { config };
