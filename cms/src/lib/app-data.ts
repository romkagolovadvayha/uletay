import type { RowDataPacket } from 'mysql2';
import type { AppData } from '@/types';
import { getPool } from './db';

export async function getAppData(): Promise<AppData> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT content FROM app_content WHERE id = 1 LIMIT 1',
  );

  const row = rows[0];
  if (!row) {
    throw new Error('App content not found. Run: npm run db:install --prefix cms');
  }

  const content = JSON.parse(row.content) as AppData;
  if (!content || typeof content !== 'object') {
    throw new Error('Invalid app content JSON');
  }

  return content;
}

export async function saveAppData(content: AppData): Promise<void> {
  const pool = getPool();
  const json = JSON.stringify(content);
  await pool.query(
    'UPDATE app_content SET content = ?, updated_at = NOW() WHERE id = 1',
    [json],
  );
}

export function validateAppData(data: unknown): data is AppData {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const keys = ['festival', 'stages', 'schedule', 'autographs', 'foodcourt'] as const;
  return keys.every((key) => key in data);
}
