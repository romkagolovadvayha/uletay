import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type { LatLng, UserMapMarker, UserMapMarkerKind } from '../types/map';

const STORAGE_KEY = 'uletay:user-map-markers:v1';

type StoredMarkers = Partial<Record<UserMapMarkerKind, UserMapMarker>>;

export function useUserMapMarkers() {
  const [markers, setMarkers] = useState<StoredMarkers>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed = JSON.parse(raw) as StoredMarkers;
        setMarkers(parsed);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((next: StoredMarkers) => {
    setMarkers(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const saveMarker = useCallback(
    (kind: UserMapMarkerKind, coordinate: LatLng, accuracy?: number | null) => {
      persist({
        ...markers,
        [kind]: {
          kind,
          coordinate,
          savedAt: Date.now(),
          accuracy: accuracy ?? undefined,
        },
      });
    },
    [markers, persist],
  );

  const removeMarker = useCallback(
    (kind: UserMapMarkerKind) => {
      const next = { ...markers };
      delete next[kind];
      persist(next);
    },
    [markers, persist],
  );

  return {
    markers: (['car', 'tent'] as const)
      .map((kind) => markers[kind])
      .filter((marker): marker is UserMapMarker => Boolean(marker)),
    loaded,
    saveMarker,
    removeMarker,
  };
}
