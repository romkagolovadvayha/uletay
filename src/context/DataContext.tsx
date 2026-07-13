import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { invalidateAppDataCache, loadAppDataFromApi } from '../api/appDataApi';
import { AppData } from '../types';
import { normalizeAppData } from '../utils/appDataNormalize';
import { defaultAppData } from '../storage/dataStore';

const CACHE_KEY = '@uletay_api_cache_v2';

function readCachedAppDataSync(): AppData | null {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { data?: AppData };
    return parsed?.data ? normalizeAppData(parsed.data) : null;
  } catch {
    return null;
  }
}

function getInitialAppData(): AppData {
  return readCachedAppDataSync() ?? defaultAppData;
}

type DataContextValue = {
  data: AppData;
  isLoading: boolean;
  error: string | null;
  refreshData: (force?: boolean) => Promise<void>;
  lastFetchedAt: number | null;
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(getInitialAppData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);

  const refreshData = useCallback(async (force = false) => {
    if (force) {
      invalidateAppDataCache();
    }
    setIsLoading(true);
    try {
      const next = normalizeAppData(await loadAppDataFromApi(force));
      setData(next);
      setLastFetchedAt(Date.now());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const next = normalizeAppData(await loadAppDataFromApi(false));
        if (!cancelled) {
          setData(next);
          setLastFetchedAt(Date.now());
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ data, isLoading, error, refreshData, lastFetchedAt }),
    [data, isLoading, error, refreshData, lastFetchedAt],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useAppData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useAppData must be used within DataProvider');
  }
  return context;
}
