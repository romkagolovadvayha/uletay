import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import {
  APP_DATA_CACHE_KEY,
  invalidateAppDataCache,
  loadAppDataFromApi,
  readCachedAppData,
  refreshAppDataInBackground,
} from '../api/appDataApi';
import { APP_DATA_REFRESH_INTERVAL_MS, APP_DATA_RETRY_INTERVAL_MS } from '../config/api';
import { AppData } from '../types';
import { normalizeAppData } from '../utils/appDataNormalize';
import { defaultAppData } from '../storage/dataStore';
import { colors } from '../theme/colors';

function readCachedAppDataSync(): AppData | null {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(APP_DATA_CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { data?: AppData; fetchedAt?: number };
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
  /** True until the first cache/API result is ready on a cold start (no local data yet). */
  isInitialLoading: boolean;
  error: string | null;
  refreshData: (force?: boolean) => Promise<void>;
  lastFetchedAt: number | null;
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(getInitialAppData);
  const [isHydrated, setIsHydrated] = useState(Platform.OS === 'web');
  const [isInitialLoading, setIsInitialLoading] = useState(
    Platform.OS !== 'web' || !readCachedAppDataSync(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const lastFetchedAtRef = React.useRef<number | null>(null);

  const applyCachedSnapshot = useCallback(async () => {
    const cached = await readCachedAppData();
    if (cached) {
      setData(normalizeAppData(cached.data));
      setLastFetchedAt(cached.fetchedAt);
      lastFetchedAtRef.current = cached.fetchedAt;
      setIsInitialLoading(false);
    }
    return cached;
  }, []);

  const applyFreshData = useCallback(async (fresh: AppData) => {
    setData(normalizeAppData(fresh));
    const cached = await readCachedAppData();
    const fetchedAt = cached?.fetchedAt ?? Date.now();
    setLastFetchedAt(fetchedAt);
    lastFetchedAtRef.current = fetchedAt;
    setIsInitialLoading(false);
    setError(null);
  }, []);

  const refreshData = useCallback(async (force = false) => {
    if (force) {
      invalidateAppDataCache();
      setIsLoading(true);
    }

    try {
      if (force) {
        const next = await loadAppDataFromApi(true);
        setData(next);
        const cached = await readCachedAppData();
        const fetchedAt = cached?.fetchedAt ?? Date.now();
        setLastFetchedAt(fetchedAt);
        lastFetchedAtRef.current = fetchedAt;
        setIsInitialLoading(false);
        setError(null);
        return;
      }

      const fresh = await refreshAppDataInBackground();
      if (fresh) {
        await applyFreshData(fresh);
      }
    } catch (err) {
      if (force) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      }
    } finally {
      if (force) {
        setIsLoading(false);
      }
    }
  }, [applyFreshData]);

  useEffect(() => {
    let cancelled = false;

    const tryRefresh = async () => {
      const fresh = await refreshAppDataInBackground();
      if (cancelled) {
        return;
      }
      if (fresh) {
        await applyFreshData(fresh);
        return;
      }
      const cached = await readCachedAppData();
      if (!cached) {
        setError('Нет связи с сервером. Показаны данные по умолчанию.');
      }
      setIsInitialLoading(false);
    };

    void (async () => {
      const cached = await applyCachedSnapshot();
      if (cancelled) {
        return;
      }
      setIsHydrated(true);

      if (cached) {
        void tryRefresh();
        return;
      }

      await tryRefresh();
    })();

    const refreshInterval = setInterval(() => {
      void tryRefresh();
    }, APP_DATA_REFRESH_INTERVAL_MS);

    const retryInterval = setInterval(() => {
      if (lastFetchedAtRef.current !== null) {
        return;
      }
      void tryRefresh();
    }, APP_DATA_RETRY_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(refreshInterval);
      clearInterval(retryInterval);
    };
  }, [applyCachedSnapshot, applyFreshData]);

  const value = useMemo(
    () => ({ data, isLoading, isInitialLoading, error, refreshData, lastFetchedAt }),
    [data, isLoading, isInitialLoading, error, refreshData, lastFetchedAt],
  );

  if (!isHydrated) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useAppData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useAppData must be used within DataProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
