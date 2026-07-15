import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import {
  APP_DATA_CACHE_KEY,
  invalidateAppDataCache,
  loadAppDataFromApi,
  readCachedAppData,
  refreshAppDataInBackground,
} from '../api/appDataApi';
import { APP_DATA_REFRESH_INTERVAL_MS } from '../config/api';
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
  error: string | null;
  refreshData: (force?: boolean) => Promise<void>;
  lastFetchedAt: number | null;
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(getInitialAppData);
  const [isHydrated, setIsHydrated] = useState(Platform.OS === 'web');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);

  const applyCachedSnapshot = useCallback(async () => {
    const cached = await readCachedAppData();
    if (cached) {
      setData(normalizeAppData(cached.data));
      setLastFetchedAt(cached.fetchedAt);
    }
    return cached;
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
        setLastFetchedAt(cached?.fetchedAt ?? Date.now());
        setError(null);
        return;
      }

      const fresh = await refreshAppDataInBackground();
      if (fresh) {
        setData(normalizeAppData(fresh));
        const cached = await readCachedAppData();
        setLastFetchedAt(cached?.fetchedAt ?? Date.now());
        setError(null);
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
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await applyCachedSnapshot();
      if (!cancelled) {
        setIsHydrated(true);
      }

      const fresh = await refreshAppDataInBackground();
      if (!cancelled && fresh) {
        setData(normalizeAppData(fresh));
        const cached = await readCachedAppData();
        setLastFetchedAt(cached?.fetchedAt ?? Date.now());
        setError(null);
      }
    })();

    const interval = setInterval(() => {
      void refreshAppDataInBackground().then((fresh) => {
        if (!fresh) {
          return;
        }
        setData(normalizeAppData(fresh));
        void readCachedAppData().then((cached) => {
          setLastFetchedAt(cached?.fetchedAt ?? null);
        });
        setError(null);
      });
    }, APP_DATA_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [applyCachedSnapshot]);

  const value = useMemo(
    () => ({ data, isLoading, error, refreshData, lastFetchedAt }),
    [data, isLoading, error, refreshData, lastFetchedAt],
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
