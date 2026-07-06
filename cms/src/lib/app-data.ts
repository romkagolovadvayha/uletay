import type { RowDataPacket } from 'mysql2';
import type { AppData, MapPathsGeoJson, MapZonesGeoJson } from '@/types';
import { getPool } from './db';

const EMPTY_ZONES: MapZonesGeoJson = { type: 'FeatureCollection', features: [] };
const EMPTY_PATHS: MapPathsGeoJson = { type: 'FeatureCollection', features: [] };

function normalizeFeatureCollection<T extends MapZonesGeoJson | MapPathsGeoJson>(
  value: unknown,
  fallback: T,
): T {
  if (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: string }).type === 'FeatureCollection' &&
    Array.isArray((value as { features?: unknown }).features)
  ) {
    return value as T;
  }
  return fallback;
}

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

  return {
    ...content,
    schedule: Array.isArray(content.schedule) ? content.schedule : [],
    autographs: Array.isArray(content.autographs) ? content.autographs : [],
    foodcourt: Array.isArray(content.foodcourt) ? content.foodcourt : [],
    stages: Array.isArray(content.stages) ? content.stages : [],
    mapZones: normalizeFeatureCollection(content.mapZones, EMPTY_ZONES),
    mapPaths: normalizeFeatureCollection(content.mapPaths, EMPTY_PATHS),
  };
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
