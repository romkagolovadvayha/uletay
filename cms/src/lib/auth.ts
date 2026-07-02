import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { RowDataPacket } from 'mysql2';
import { getPool } from './db';
import { config } from './config';

export async function verifyAdminCredentials(
  username: string,
  password: string,
): Promise<number | null> {
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
    [userId, token],
  );
  return token;
}

export async function verifyBearerToken(authHeader: string | null): Promise<boolean> {
  if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
    return false;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM admin_sessions WHERE token = ? AND expires_at > NOW() LIMIT 1',
    [token],
  );

  return rows.length > 0;
}

export async function loginWithCredentials(
  username: string,
  password: string,
): Promise<string | null> {
  const userId = await verifyAdminCredentials(username, password);
  if (!userId) {
    return null;
  }
  return createAdminSession(userId);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export { config };
