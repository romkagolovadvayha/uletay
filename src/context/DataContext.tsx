import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from 'react-native';
import {
  APP_DATA_CACHE_KEY,
  AppDataRefreshResult,
  isCurrentFestivalEdition,
  readCachedAppData,
  refreshAppDataInBackground,
} from '../api/appDataApi';
import {
  APP_DATA_REFRESH_INTERVAL_MS,
  APP_DATA_RETRY_INTERVAL_MS,
  CachedAppData,
} from '../config/api';
import { AppData } from '../types';
import { normalizeAppData } from '../utils/appDataNormalize';
import { defaultAppData } from '../storage/dataStore';
import { colors } from '../theme/colors';

export type AppDataSource = 'remote' | 'cache' | 'fallback' | 'demo';

type InitialAppData = {
  data: AppData;
  dataSource: AppDataSource;
  fetchedAt: number | null;
};

function readCachedAppDataSync(): CachedAppData | null {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(APP_DATA_CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { data?: AppData; fetchedAt?: number };
    return parsed?.data &&
      typeof parsed.fetchedAt === 'number' &&
      isCurrentFestivalEdition(parsed.data)
      ? { data: normalizeAppData(parsed.data), fetchedAt: parsed.fetchedAt }
      : null;
  } catch {
    return null;
  }
}

function getInitialAppData(): InitialAppData {
  const cached = readCachedAppDataSync();
  if (cached) {
    return {
      data: cached.data,
      dataSource: 'cache',
      fetchedAt: cached.fetchedAt,
    };
  }
  return {
    data: defaultAppData,
    dataSource: 'fallback',
    fetchedAt: null,
  };
}

type DataContextValue = {
  data: AppData;
  dataSource: AppDataSource;
  isLoading: boolean;
  /** True until the first cache/API result is ready on a cold start (no local data yet). */
  isInitialLoading: boolean;
  error: string | null;
  refreshData: (force?: boolean) => Promise<void>;
  lastFetchedAt: number | null;
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

export { DataContext };

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [initialData] = useState(getInitialAppData);
  const [data, setData] = useState<AppData>(initialData.data);
  const [dataSource, setDataSource] = useState<AppDataSource>(initialData.dataSource);
  const [isHydrated, setIsHydrated] = useState(Platform.OS === 'web');
  const [isInitialLoading, setIsInitialLoading] = useState(
    Platform.OS !== 'web' || initialData.dataSource === 'fallback',
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(initialData.fetchedAt);

  const applyCachedData = useCallback((cached: CachedAppData) => {
    setData(normalizeAppData(cached.data));
    setDataSource('cache');
    setLastFetchedAt(cached.fetchedAt);
    setIsInitialLoading(false);
  }, []);

  const applyCachedSnapshot = useCallback(async () => {
    const cached = await readCachedAppData();
    if (cached) {
      applyCachedData(cached);
    }
    return cached;
  }, [applyCachedData]);

  const applyFreshData = useCallback((fresh: CachedAppData) => {
    setData(normalizeAppData(fresh.data));
    setDataSource('remote');
    setLastFetchedAt(fresh.fetchedAt);
    setIsInitialLoading(false);
    setError(null);
  }, []);

  const applyRefreshResult = useCallback(
    (result: AppDataRefreshResult) => {
      if (result.status === 'fresh') {
        applyFreshData(result.cached);
        return;
      }

      if (result.status === 'not-needed') {
        applyCachedData(result.cached);
        // Cache is still within the refresh window — no need to keep a stale error banner.
        setError(null);
        return;
      }

      if (result.cached) {
        applyCachedData(result.cached);
      } else {
        setData(defaultAppData);
        setDataSource('fallback');
        setLastFetchedAt(null);
        setIsInitialLoading(false);
      }
      setError('Нет связи с сервером. Не удалось загрузить актуальные данные.');
    },
    [applyCachedData, applyFreshData],
  );

  const refreshData = useCallback(async (force = false) => {
    if (force) {
      setIsLoading(true);
    }

    try {
      const result = await refreshAppDataInBackground(force);
      applyRefreshResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить данные');
    } finally {
      if (force) {
        setIsLoading(false);
      }
    }
  }, [applyRefreshResult]);

  useEffect(() => {
    let cancelled = false;
    let appIsActive = AppState.currentState === 'active';

    const tryRefresh = async () => {
      const result = await refreshAppDataInBackground();
      if (cancelled) {
        return;
      }
      applyRefreshResult(result);
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
      if (appIsActive) void tryRefresh();
    }, APP_DATA_REFRESH_INTERVAL_MS);

    const retryInterval = setInterval(() => {
      if (!appIsActive) {
        return;
      }
      void tryRefresh();
    }, APP_DATA_RETRY_INTERVAL_MS);

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      const becameActive = !appIsActive && nextState === 'active';
      appIsActive = nextState === 'active';
      if (becameActive) void tryRefresh();
    });

    return () => {
      cancelled = true;
      clearInterval(refreshInterval);
      clearInterval(retryInterval);
      appStateSubscription.remove();
    };
  }, [applyCachedSnapshot, applyRefreshResult]);

  const value = useMemo(
    () => ({
      data,
      dataSource,
      isLoading,
      isInitialLoading,
      error,
      refreshData,
      lastFetchedAt,
    }),
    [data, dataSource, isLoading, isInitialLoading, error, refreshData, lastFetchedAt],
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

export function useRawAppData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useRawAppData must be used within DataProvider');
  }
  return context;
}

export function useAppData() {
  return useRawAppData();
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
