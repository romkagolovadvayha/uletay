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
    'SELECT id, password_hash FROM admin_users WHERE username = ? LIMIT 1',
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
  await pool.query(
    'INSERT INTO admin_sessions (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
    [userId, 'sha256:' + createHash('sha256').update(token).digest('hex')],
  );
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
    'SELECT id, token FROM admin_sessions WHERE token IN (?, ?) AND expires_at > NOW() LIMIT 1',
    [digest, token],
  );
  if (rows[0]?.token === token) {
    await pool.query('UPDATE admin_sessions SET token = ? WHERE id = ? AND token = ?', [digest, rows[0].id, token]);
  }
  return rows.length > 0;
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
