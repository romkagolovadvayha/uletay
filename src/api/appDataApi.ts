import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData } from '../types';
import { API_BASE_URL, APP_DATA_REFRESH_INTERVAL_MS, CachedAppData } from '../config/api';
import { defaultAppData } from '../storage/dataStore';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { normalizeAppData } from '../utils/appDataNormalize';

export const APP_DATA_CACHE_KEY = '@uletay_api_cache_v2';
const FETCH_TIMEOUT_MS = 8_000;

let memoryCache: CachedAppData | null = null;
let inFlight: Promise<AppData | null> | null = null;

async function readStorageCache(): Promise<CachedAppData | null> {
  try {
    const raw = await AsyncStorage.getItem(APP_DATA_CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CachedAppData;
    if (!parsed?.data || typeof parsed.fetchedAt !== 'number') {
      return null;
    }
    return { data: normalizeAppData(parsed.data), fetchedAt: parsed.fetchedAt };
  } catch {
    return null;
  }
}

async function writeStorageCache(cache: CachedAppData): Promise<void> {
  await AsyncStorage.setItem(APP_DATA_CACHE_KEY, JSON.stringify(cache));
}

function needsRefresh(cache: CachedAppData | null, force: boolean): boolean {
  if (force) {
    return true;
  }
  if (!cache) {
    return true;
  }
  return Date.now() - cache.fetchedAt >= APP_DATA_REFRESH_INTERVAL_MS;
}

export async function readCachedAppData(): Promise<CachedAppData | null> {
  if (memoryCache) {
    return memoryCache;
  }
  const storageCache = await readStorageCache();
  if (storageCache) {
    memoryCache = storageCache;
  }
  return storageCache;
}

async function fetchRemoteAppData(): Promise<AppData> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/data`,
    { headers: { Accept: 'application/json' } },
    FETCH_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return (await response.json()) as AppData;
}

export async function fetchAndCacheAppData(): Promise<AppData | null> {
  try {
    const data = normalizeAppData(await fetchRemoteAppData());
    const cache: CachedAppData = { data, fetchedAt: Date.now() };
    memoryCache = cache;
    await writeStorageCache(cache);
    return data;
  } catch {
    return null;
  }
}

export async function refreshAppDataInBackground(): Promise<AppData | null> {
  const cached = await readCachedAppData();
  if (!needsRefresh(cached, false)) {
    return null;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = fetchAndCacheAppData().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

export async function loadAppDataFromApi(force = false): Promise<AppData> {
  const cached = await readCachedAppData();

  if (!needsRefresh(cached, force)) {
    return cached!.data;
  }

  const fresh = await fetchAndCacheAppData();
  if (fresh) {
    return fresh;
  }

  if (cached) {
    return cached.data;
  }

  return defaultAppData;
}

export function invalidateAppDataCache(): void {
  memoryCache = null;
  inFlight = null;
}
