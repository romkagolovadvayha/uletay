import { randomBytes } from 'node:crypto';
import type { RowDataPacket } from 'mysql2';
import { getPool } from './db';
import { hashPassword } from './auth';

export type AdminUser = {
  id: number;
  username: string;
  vkId: string | null;
  displayName: string;
  role: 'owner' | 'admin';
  active: boolean;
};

function toAdmin(row: RowDataPacket): AdminUser {
  return {
    id: row.id,
    username: row.username,
    vkId: row.vk_id,
    displayName: row.display_name || row.username,
    role: row.role,
    active: Boolean(row.is_active),
  };
}

export function parseVkId(value: string): string {
  const id = value.trim().replace(/^id/, '');
  if (!/^[1-9][0-9]{0,19}$/.test(id))
    throw new Error('Укажите числовой VK ID, например 123456789.');
  return id;
}

export async function findAdminByVkId(vkId: string): Promise<AdminUser | null> {
  const [rows] = await getPool().execute<RowDataPacket[]>(
    'SELECT * FROM admin_users WHERE vk_id = ? AND is_active = TRUE LIMIT 1',
    [parseVkId(vkId)],
  );
  return rows[0] ? toAdmin(rows[0]) : null;
}

export async function listAdmins(): Promise<AdminUser[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT id, username, vk_id, display_name, role, is_active FROM admin_users ORDER BY (role = 'owner') DESC, id",
  );
  return rows.map(toAdmin);
}

export async function grantVkAccess(vkId: string, name: string): Promise<void> {
  const id = parseVkId(vkId);
  if (name.trim().length > 120) throw new Error('Имя должно содержать не более 120 символов.');
  const password = await hashPassword(randomBytes(32).toString('hex'));
  await getPool().execute(
    `INSERT INTO admin_users (username, password_hash, vk_id, display_name, role)
     VALUES (?, ?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), is_active = TRUE`,
    [`vk:${id}`, password, id, name.trim() || `VK ID ${id}`],
  );
}

export async function revokeVkAccess(userId: number): Promise<void> {
  if (!Number.isSafeInteger(userId) || userId < 1) throw new Error('Некорректный пользователь.');
  const db = await getPool().getConnection();
  try {
    await db.beginTransaction();
    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT id FROM admin_users WHERE id = ? AND role = 'admin' AND vk_id IS NOT NULL FOR UPDATE",
      [userId],
    );
    if (!rows.length)
      throw new Error('Отозвать доступ можно только у добавленного VK-пользователя.');
    await db.execute('UPDATE admin_users SET is_active = FALSE WHERE id = ?', [userId]);
    await db.execute('DELETE FROM admin_sessions WHERE user_id = ?', [userId]);
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    db.release();
  }
}
