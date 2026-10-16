import type { Connection, RowDataPacket } from 'mysql2/promise';

/** Additive and repeatable for databases created before VK access was introduced. */
export async function migrateAdminAccess(db: Connection) {
  const [rows] = await db.query<RowDataPacket[]>('SHOW COLUMNS FROM admin_users');
  const columns = new Set(rows.map((row) => row.Field));
  if (!columns.has('vk_id')) {
    await db.query('ALTER TABLE admin_users ADD COLUMN vk_id VARCHAR(20) NULL UNIQUE');
  }
  if (!columns.has('display_name')) {
    await db.query(
      "ALTER TABLE admin_users ADD COLUMN display_name VARCHAR(120) NOT NULL DEFAULT ''",
    );
  }
  if (!columns.has('role')) {
    await db.query(
      "ALTER TABLE admin_users ADD COLUMN role ENUM('owner', 'admin') NOT NULL DEFAULT 'owner'",
    );
  }
  if (!columns.has('is_active')) {
    await db.query('ALTER TABLE admin_users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE');
  }
}
