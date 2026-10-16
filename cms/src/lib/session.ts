import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import { getPool } from './db';
import { createAdminSession } from './auth';
import type { AdminUser } from './admin-access';

export interface SessionData {
  adminUserId?: number;
  sessionToken?: string;
  vkOAuth?: { state: string; verifier: string; expiresAt: number };
}

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV === 'production' ? '' : 'dev-secret-change-me-min-32-chars-long!!'),
  ttl: 7 * 24 * 60 * 60,
  cookieName: 'uletay_admin',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  },
};

export async function getSession() {
  if (String(sessionOptions.password).length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters');
  }
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function requireAdminSession(): Promise<number> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error('Unauthorized');
  return admin.id;
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const session = await getSession();
  if (!session.adminUserId || !session.sessionToken || !/^[a-f0-9]{64}$/.test(session.sessionToken))
    return null;
  const digest = 'sha256:' + createHash('sha256').update(session.sessionToken).digest('hex');
  const [rows] = await getPool().execute<RowDataPacket[]>(
    `SELECT u.id, u.username, u.vk_id, u.display_name, u.role, u.is_active
     FROM admin_users u JOIN admin_sessions s ON s.user_id = u.id
     WHERE u.id = ? AND s.token = ? AND s.expires_at > NOW() AND u.is_active = TRUE LIMIT 1`,
    [session.adminUserId, digest],
  );
  const row = rows[0];
  return row
    ? {
        id: row.id,
        username: row.username,
        vkId: row.vk_id,
        displayName: row.display_name || row.username,
        role: row.role,
        active: true,
      }
    : null;
}

export async function startBrowserSession(userId: number) {
  const session = await getSession();
  session.adminUserId = userId;
  session.sessionToken = await createAdminSession(userId);
  delete session.vkOAuth;
  await session.save();
}
