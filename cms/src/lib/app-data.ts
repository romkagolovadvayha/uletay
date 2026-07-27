import type { RowDataPacket } from 'mysql2';
import type { AppData, MapPathsGeoJson, MapPoisGeoJson, MapZonesGeoJson } from '@/types';
import { getPool } from './db';
import { resolveAllHeadlinerLastFm } from './headliner-lastfm-resolve';
import { syncAppHeadliners } from './headliners';

const EMPTY_ZONES: MapZonesGeoJson = { type: 'FeatureCollection', features: [] };
const EMPTY_PATHS: MapPathsGeoJson = { type: 'FeatureCollection', features: [] };
const EMPTY_POIS: MapPoisGeoJson = { type: 'FeatureCollection', features: [] };

type AppDataCache = {
  raw: AppData;
  client: AppData;
  updatedAt: number;
};

let appDataCache: AppDataCache | null = null;

function normalizeFeatureCollection<T extends MapZonesGeoJson | MapPathsGeoJson | MapPoisGeoJson>(
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

function normalizeStoredAppData(content: AppData): AppData {
  return syncAppHeadliners({
    ...content,
    schedule: Array.isArray(content.schedule) ? content.schedule : [],
    autographs: Array.isArray(content.autographs) ? content.autographs : [],
    foodcourt: Array.isArray(content.foodcourt) ? content.foodcourt : [],
    headliners: Array.isArray(content.headliners) ? content.headliners : [],
    rules: Array.isArray(content.rules) ? content.rules : [],
    stages: Array.isArray(content.stages) ? content.stages : [],
    mapZones: normalizeFeatureCollection(content.mapZones, EMPTY_ZONES),
    mapPaths: normalizeFeatureCollection(content.mapPaths, EMPTY_PATHS),
    mapPois: normalizeFeatureCollection(content.mapPois, EMPTY_POIS),
  });
}

function prepareClientAppData(raw: AppData): AppData {
  return {
    ...raw,
    headliners: resolveAllHeadlinerLastFm(raw.headliners),
  };
}

async function getDbUpdatedAt(): Promise<number> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT UNIX_TIMESTAMP(updated_at) AS updatedAt FROM app_content WHERE id = 1 LIMIT 1',
  );
  const updatedAt = rows[0]?.updatedAt;
  return typeof updatedAt === 'number' ? updatedAt : Number(updatedAt ?? 0);
}

async function loadRawAppDataFromDb(): Promise<AppData> {
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

  return normalizeStoredAppData(content);
}

async function ensureAppDataCache(): Promise<AppDataCache> {
  const updatedAt = await getDbUpdatedAt();
  if (appDataCache && appDataCache.updatedAt === updatedAt) {
    return appDataCache;
  }

  const raw = await loadRawAppDataFromDb();
  appDataCache = {
    raw,
    client: prepareClientAppData(raw),
    updatedAt,
  };
  return appDataCache;
}

export function invalidateAppDataCache(): void {
  appDataCache = null;
}

export async function getAppData(): Promise<AppData> {
  const cache = await ensureAppDataCache();
  return cache.raw;
}

export async function getClientAppData(): Promise<AppData> {
  const cache = await ensureAppDataCache();
  return cache.client;
}

export async function saveAppData(content: AppData): Promise<void> {
  const pool = getPool();
  const json = JSON.stringify(normalizeStoredAppData(content));
  await pool.query(
    'UPDATE app_content SET content = ?, updated_at = NOW() WHERE id = 1',
    [json],
  );
  invalidateAppDataCache();
}

export function validateAppData(data: unknown): data is AppData {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const keys = ['festival', 'stages', 'schedule', 'autographs', 'foodcourt', 'headliners'] as const;
  return keys.every((key) => key in data);
}
