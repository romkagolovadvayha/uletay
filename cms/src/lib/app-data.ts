import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { createHash } from 'node:crypto';
import { validateAppData } from '../../../shared/app-data-validation';
import type { AppData, MapPathsGeoJson, MapPoisGeoJson, MapZonesGeoJson } from '@/types';
import { getPool } from './db';
import { resolveAllHeadlinerLastFm } from './headliner-lastfm-resolve';
import { toClientLastFmProfile } from './lastfm-tracks';
import { syncAppHeadliners } from './headliners';

export { validateAppData } from '../../../shared/app-data-validation';

const EMPTY_ZONES: MapZonesGeoJson = { type: 'FeatureCollection', features: [] };
const EMPTY_PATHS: MapPathsGeoJson = { type: 'FeatureCollection', features: [] };
const EMPTY_POIS: MapPoisGeoJson = { type: 'FeatureCollection', features: [] };

type AppDataCache = {
  raw: AppData;
  client: AppData;
  revision: string;
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
    foodcourt: Array.isArray(content.foodcourt) ? content.foodcourt.map((vendor) => ({ ...vendor, imageTint: vendor.imageTint ?? '#3A3018' })) : [],
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
    headliners: resolveAllHeadlinerLastFm(raw.headliners).map((headliner) => ({
      ...headliner,
      lastfm: headliner.lastfm ? toClientLastFmProfile(headliner.lastfm) : undefined,
    })),
  };
}

async function getDbRevision(): Promise<string> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT SHA2(content, 256) AS revision FROM app_content WHERE id = 1 LIMIT 1',
  );
  return String(rows[0]?.revision ?? '');
}

async function loadRawAppDataFromDb(): Promise<AppData> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT content, SHA2(content, 256) AS revision FROM app_content WHERE id = 1 LIMIT 1',
  );

  const row = rows[0];
  if (!row) {
    throw new Error('App content not found. Run: npm run db:install --prefix cms');
  }

  const content = JSON.parse(row.content) as AppData;
  if (!content || typeof content !== 'object') {
    throw new Error('Invalid app content JSON');
  }

  const normalized = normalizeStoredAppData(content);
  if (!validateAppData(normalized)) throw new Error('Некорректные данные фестиваля в базе');
  return { ...normalized, revision: String(row.revision) };
}

async function ensureAppDataCache(): Promise<AppDataCache> {
  const revision = await getDbRevision();
  if (appDataCache && appDataCache.revision === revision) {
    return appDataCache;
  }

  const raw = await loadRawAppDataFromDb();
  appDataCache = {
    raw,
    client: prepareClientAppData(structuredClone(raw)),
    revision: raw.revision!,
  };
  return appDataCache;
}

export function invalidateAppDataCache(): void {
  appDataCache = null;
}

export async function getAppData(): Promise<AppData> {
  const cache = await ensureAppDataCache();
  return structuredClone(cache.raw);
}

export async function getClientAppData(): Promise<AppData> {
  const cache = await ensureAppDataCache();
  return structuredClone(cache.client);
}

export class AppDataConflictError extends Error {
  constructor() { super('Данные уже изменены. Обновите страницу и повторите правку.'); }
}

export class AppDataValidationError extends Error {
  constructor() { super('Некорректные данные: проверьте обязательные поля, даты, ссылки и геометрию карты.'); }
}

export async function saveAppData(content: AppData): Promise<void> {
  if (!validateAppData(content)) throw new AppDataValidationError();
  if (!content.revision) throw new AppDataConflictError();
  const pool = getPool();
  const { revision, ...snapshot } = content;
  const json = JSON.stringify(normalizeStoredAppData(snapshot));
  // A content fingerprint also detects writes by existing maintenance scripts;
  // no schema migration or second-resolution timestamp is involved.
  const [result] = await pool.query<ResultSetHeader>(
    'UPDATE app_content SET content = ?, updated_at = NOW() WHERE id = 1 AND SHA2(content, 256) = ?',
    [json, revision],
  );
  if (result.affectedRows !== 1) {
    invalidateAppDataCache();
    throw new AppDataConflictError();
  }
  content.revision = createHash('sha256').update(json).digest('hex');
  invalidateAppDataCache();
}
