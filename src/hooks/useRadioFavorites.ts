import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type { RadioNowPlaying } from '../api/radioNowPlayingApi';

const STORAGE_KEY = 'uletay:favorite-radio-tracks:v1';
const MAX_FAVORITES = 100;

export function useRadioFavorites() {
  const [favorites, setFavorites] = useState<RadioNowPlaying[]>([]);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw ? setFavorites(JSON.parse(raw) as RadioNowPlaying[]) : undefined)
      .catch(() => undefined);
  }, []);

  const isFavorite = useCallback(
    (track?: RadioNowPlaying | null) =>
      Boolean(track?.raw && favorites.some((item) => item.raw === track.raw)),
    [favorites],
  );

  const toggleFavorite = useCallback((track: RadioNowPlaying) => {
    setFavorites((current) => {
      const exists = current.some((item) => item.raw === track.raw);
      const next = exists
        ? current.filter((item) => item.raw !== track.raw)
        : [track, ...current].slice(0, MAX_FAVORITES);
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}
