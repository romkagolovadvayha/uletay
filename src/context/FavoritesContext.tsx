import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  FavoriteType,
  favoriteKey,
  isFavoriteKey,
  normalizeFavoriteKeys,
  toggleFavoriteKey,
} from '../utils/favoriteKeys';
import { buildDemoFavoriteKeys } from '../utils/demoData';
import { useAppData } from './DataContext';
import { useDemoMode } from './DemoModeContext';

const FAVORITES_KEY = '@uletay_favorites';

type FavoritesContextValue = {
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  isAutographFavorite: (id: string) => boolean;
  toggleAutographFavorite: (id: string) => void;
  isFoodFavorite: (id: string) => boolean;
  toggleFoodFavorite: (id: string) => void;
  addedToastVisible: boolean;
  hideAddedToast: () => void;
  isReady: boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { mode } = useDemoMode();
  const { data } = useAppData();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [demoSuppressed, setDemoSuppressed] = useState<string[]>([]);
  const [suppressedForMode, setSuppressedForMode] = useState(mode);
  const [isReady, setIsReady] = useState(false);
  const [addedToastVisible, setAddedToastVisible] = useState(false);

  if (suppressedForMode !== mode) {
    setSuppressedForMode(mode);
    setDemoSuppressed([]);
  }

  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY)
      .then((value) => {
        if (!value) {
          return;
        }
        try {
          setFavorites(normalizeFavoriteKeys(JSON.parse(value)));
        } catch {
          setFavorites([]);
        }
      })
      .finally(() => setIsReady(true));
  }, []);

  const demoFavoriteKeys = useMemo(() => {
    if (mode !== 'demo') {
      return [] as string[];
    }
    const seedKey = `${data.festival.startDate}:${data.festival.endDate}`;
    return buildDemoFavoriteKeys(data.schedule, data.autographs, seedKey);
  }, [data.autographs, data.festival.endDate, data.festival.startDate, data.schedule, mode]);

  const effectiveFavorites = useMemo(() => {
    if (mode !== 'demo' || demoFavoriteKeys.length === 0) {
      return favorites;
    }
    const demoVisible = demoFavoriteKeys.filter((key) => !demoSuppressed.includes(key));
    return [...new Set([...demoVisible, ...favorites])];
  }, [demoFavoriteKeys, demoSuppressed, favorites, mode]);

  const persist = useCallback(async (next: string[]) => {
    setFavorites(next);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }, []);

  const hideAddedToast = useCallback(() => {
    setAddedToastVisible(false);
  }, []);

  const toggle = useCallback(
    (type: FavoriteType, id: string) => {
      const key = favoriteKey(type, id);
      const isCurrentlyFavorite = effectiveFavorites.includes(key);

      if (mode === 'demo' && demoFavoriteKeys.includes(key)) {
        if (isCurrentlyFavorite) {
          setDemoSuppressed((current) => (current.includes(key) ? current : [...current, key]));
          if (favorites.includes(key)) {
            void persist(favorites.filter((item) => item !== key));
          }
        } else {
          setDemoSuppressed((current) => current.filter((item) => item !== key));
          if (!favorites.includes(key)) {
            void persist([...favorites, key]);
            setAddedToastVisible(true);
          }
        }
        return;
      }

      const isAdding = !favorites.includes(key);
      const next = toggleFavoriteKey(favorites, type, id);
      void persist(next);
      if (isAdding) {
        setAddedToastVisible(true);
      }
    },
    [demoFavoriteKeys, effectiveFavorites, favorites, mode, persist],
  );

  const isFavorite = useCallback(
    (id: string) => isFavoriteKey(effectiveFavorites, 'performance', id),
    [effectiveFavorites],
  );

  const toggleFavorite = useCallback((id: string) => toggle('performance', id), [toggle]);

  const isAutographFavorite = useCallback(
    (id: string) => isFavoriteKey(effectiveFavorites, 'autograph', id),
    [effectiveFavorites],
  );

  const toggleAutographFavorite = useCallback((id: string) => toggle('autograph', id), [toggle]);

  const isFoodFavorite = useCallback(
    (id: string) => isFavoriteKey(effectiveFavorites, 'food', id),
    [effectiveFavorites],
  );

  const toggleFoodFavorite = useCallback((id: string) => toggle('food', id), [toggle]);

  const value = useMemo(
    () => ({
      favorites: effectiveFavorites,
      isFavorite,
      toggleFavorite,
      isAutographFavorite,
      toggleAutographFavorite,
      isFoodFavorite,
      toggleFoodFavorite,
      addedToastVisible,
      hideAddedToast,
      isReady,
    }),
    [
      effectiveFavorites,
      isFavorite,
      toggleFavorite,
      isAutographFavorite,
      toggleAutographFavorite,
      isFoodFavorite,
      toggleFoodFavorite,
      addedToastVisible,
      hideAddedToast,
      isReady,
    ],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
}
