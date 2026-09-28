import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, APP_DATA_REFRESH_INTERVAL_MS, CachedAppData } from '../config/api';
import { AppData } from '../types';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { normalizeAppData } from '../utils/appDataNormalize';
import { defaultAppData } from '../storage/dataStore';
import { validateAppData } from '../../shared/app-data-validation';

// v5 drops snapshots from the 2026 edition after the published festival window moved to 2027.
export const APP_DATA_CACHE_KEY = '@uletay_api_cache_v5';
/** Payload is ~1MB+; cold mobile links often need well over 8s. */
const FETCH_TIMEOUT_MS = 25_000;
const FETCH_RETRY_DELAYS_MS = [0, 1_200] as const;

let memoryCache: CachedAppData | null = null;
let inFlight: Promise<CachedAppData | null> | null = null;

export function isCurrentFestivalEdition(data: AppData): boolean {
  return data.festival.startDate >= defaultAppData.festival.startDate;
}

class ApiResponseError extends Error {
  constructor(public readonly status: number) {
    super(`API error: ${status}`);
    this.name = 'ApiResponseError';
  }
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof ApiResponseError)) {
    // Network errors and AbortController timeouts are usually transient.
    return true;
  }
  return (
    error.status === 408 ||
    error.status === 425 ||
    error.status === 429 ||
    error.status >= 500
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type AppDataRefreshResult =
  | { status: 'fresh'; cached: CachedAppData }
  | { status: 'not-needed'; cached: CachedAppData }
  | { status: 'failed'; cached: CachedAppData | null };

async function readStorageCache(): Promise<CachedAppData | null> {
  try {
    const raw = await AsyncStorage.getItem(APP_DATA_CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CachedAppData;
    if (
      !parsed?.data ||
      typeof parsed.fetchedAt !== 'number' ||
      !isCurrentFestivalEdition(parsed.data)
    ) {
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
  const age = Date.now() - cache.fetchedAt;
  return age < 0 || age >= APP_DATA_REFRESH_INTERVAL_MS;
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

async function fetchRemoteAppData(): Promise<{ data: AppData; offline: boolean }> {
  let lastError: unknown = new Error('API unavailable');

  for (let attempt = 0; attempt < FETCH_RETRY_DELAYS_MS.length; attempt += 1) {
    const delayMs = FETCH_RETRY_DELAYS_MS[attempt];
    if (delayMs > 0) {
      await wait(delayMs);
    }

    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/data`,
        {
          cache: 'no-store',
          headers: { Accept: 'application/json', ...(memoryCache?.data.revision ? { 'If-None-Match': `"${memoryCache.data.revision}"` } : {}) },
        },
        FETCH_TIMEOUT_MS,
      );

      if (response.status === 304 && memoryCache) return { data: memoryCache.data, offline: false };
      if (!response.ok) {
        throw new ApiResponseError(response.status);
      }

      const payload: unknown = await response.json();
      if (!validateAppData(payload)) throw new ApiResponseError(422);
      return { data: payload, offline: response.headers.get('X-Uletay-Offline') === '1' };
    } catch (error) {
      lastError = error;
      const lastAttempt = attempt === FETCH_RETRY_DELAYS_MS.length - 1;
      if (lastAttempt || !isRetryableError(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}

export async function fetchAndCacheAppData(): Promise<CachedAppData | null> {
  try {
    const { data: remote, offline } = await fetchRemoteAppData();
    if (offline) {
      // A worker's fallback can be older than AsyncStorage. Never roll back an
      // existing snapshot or mark an unverified offline response as freshly fetched.
      if (!memoryCache) {
        memoryCache = { data: normalizeAppData(remote), fetchedAt: 0 };
        await writeStorageCache(memoryCache).catch(() => {});
      }
      return null;
    }
    const unchanged = Boolean(remote.revision && remote.revision === memoryCache?.data.revision);
    const data = unchanged && memoryCache
      ? memoryCache.data : normalizeAppData(remote);
    const cache: CachedAppData = { data, fetchedAt: Date.now() };
    memoryCache = cache;
    try {
      if (!unchanged) await writeStorageCache(cache);
    } catch {
      // Quota / private mode on mobile Safari: keep the in-memory snapshot for this session.
    }
    return cache;
  } catch {
    return null;
  }
}

export async function refreshAppDataInBackground(
  force = false,
): Promise<AppDataRefreshResult> {
  const cached = await readCachedAppData();
  if (!needsRefresh(cached, force)) {
    return { status: 'not-needed', cached: cached! };
  }

  const joinedInFlight = Boolean(inFlight);
  if (!inFlight) {
    inFlight = fetchAndCacheAppData().finally(() => {
      inFlight = null;
    });
  }

  let fresh = await inFlight;
  if (fresh) {
    return { status: 'fresh', cached: fresh };
  }

  // Explicit pull-to-refresh should not stick to a failed shared in-flight from startup.
  if (force && joinedInFlight) {
    if (!inFlight) {
      inFlight = fetchAndCacheAppData().finally(() => {
        inFlight = null;
      });
    }
    fresh = await inFlight;
    if (fresh) {
      return { status: 'fresh', cached: fresh };
    }
  }

  return { status: 'failed', cached: (await readCachedAppData()) ?? cached };
}

export function invalidateAppDataCache(): void {
  memoryCache = null;
  inFlight = null;
}
