import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  FavoriteType,
  favoriteKey,
  isFavoriteKey,
  normalizeFavoriteKeys,
  toggleFavoriteKey,
} from '../utils/favoriteKeys';

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
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [addedToastVisible, setAddedToastVisible] = useState(false);

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
      const isAdding = !favorites.includes(key);
      const next = toggleFavoriteKey(favorites, type, id);
      void persist(next);
      if (isAdding) {
        setAddedToastVisible(true);
      }
    },
    [favorites, persist],
  );

  const isFavorite = useCallback((id: string) => isFavoriteKey(favorites, 'performance', id), [favorites]);

  const toggleFavorite = useCallback((id: string) => toggle('performance', id), [toggle]);

  const isAutographFavorite = useCallback(
    (id: string) => isFavoriteKey(favorites, 'autograph', id),
    [favorites],
  );

  const toggleAutographFavorite = useCallback((id: string) => toggle('autograph', id), [toggle]);

  const isFoodFavorite = useCallback((id: string) => isFavoriteKey(favorites, 'food', id), [favorites]);

  const toggleFoodFavorite = useCallback((id: string) => toggle('food', id), [toggle]);

  const value = useMemo(
    () => ({
      favorites,
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
      favorites,
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
