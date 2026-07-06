import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData } from '../types';
import { API_BASE_URL, CACHE_TTL_MS, CachedAppData } from '../config/api';
import { defaultAppData } from '../storage/dataStore';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { normalizeAppData } from '../utils/appDataNormalize';

const CACHE_KEY = '@uletay_api_cache_v1';
const FETCH_TIMEOUT_MS = 8_000;

let memoryCache: CachedAppData | null = null;
let inFlight: Promise<AppData> | null = null;

async function readStorageCache(): Promise<CachedAppData | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CachedAppData;
    if (!parsed?.data || typeof parsed.fetchedAt !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function writeStorageCache(cache: CachedAppData): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function isFresh(cache: CachedAppData): boolean {
  return Date.now() - cache.fetchedAt < CACHE_TTL_MS;
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

export async function loadAppDataFromApi(force = false): Promise<AppData> {
  if (!force && memoryCache && isFresh(memoryCache)) {
    return memoryCache.data;
  }

  if (!force) {
    const storageCache = await readStorageCache();
    if (storageCache && isFresh(storageCache)) {
      memoryCache = storageCache;
      return storageCache.data;
    }
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    try {
      const data = normalizeAppData(await fetchRemoteAppData());
      const cache: CachedAppData = { data, fetchedAt: Date.now() };
      memoryCache = cache;
      await writeStorageCache(cache);
      return data;
    } catch {
      if (memoryCache) {
        return memoryCache.data;
      }
      const storageCache = await readStorageCache();
      if (storageCache) {
        memoryCache = storageCache;
        return storageCache.data;
      }
      return defaultAppData;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function invalidateAppDataCache(): void {
  memoryCache = null;
  inFlight = null;
}
