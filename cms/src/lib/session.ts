import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  adminUserId?: number;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'dev-secret-change-me-min-32-chars-long!!',
  cookieName: 'uletay_admin',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function requireAdminSession(): Promise<number> {
  const session = await getSession();
  if (!session.adminUserId) {
    throw new Error('Unauthorized');
  }
  return session.adminUserId;
}
