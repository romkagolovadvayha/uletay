import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import type { UserLocationState } from '../types/map';

export type LocationStatus = 'loading' | 'granted' | 'denied' | 'prompt' | 'unavailable';

const PERMISSION_TIMEOUT_MS = 5_000;
const POSITION_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function toLocationState(position: Location.LocationObject): UserLocationState {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
}

async function readPermissionStatus(): Promise<'granted' | 'denied' | 'prompt'> {
  const { status } = await withTimeout(Location.getForegroundPermissionsAsync(), PERMISSION_TIMEOUT_MS);
  if (status === Location.PermissionStatus.GRANTED) return 'granted';
  if (status === Location.PermissionStatus.DENIED) return 'denied';
  return 'prompt';
}

export function useUserLocation(enabled = true) {
  const [location, setLocation] = useState<UserLocationState | null>(null);
  const [status, setStatus] = useState<LocationStatus>('loading');
  const [reduceMotion, setReduceMotion] = useState(false);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion);
    } else {
      AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    }
  }, []);

  const stopWatch = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
  }, []);

  const refreshPosition = useCallback(async () => {
    try {
      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        setLocation(toLocationState(last));
      }
    } catch {
      // Optional cache.
    }

    try {
      const current = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        POSITION_TIMEOUT_MS,
      );
      setLocation(toLocationState(current));
    } catch {
      // GPS fix can be slow; watchPositionAsync may still update later.
    }
  }, []);

  const startWatch = useCallback(async () => {
    stopWatch();
    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 4000,
        distanceInterval: 5,
      },
      (update) => {
        setLocation(toLocationState(update));
      },
    );
  }, [stopWatch]);

  const requestPermission = useCallback(async () => {
    try {
      const servicesEnabled = await withTimeout(Location.hasServicesEnabledAsync(), PERMISSION_TIMEOUT_MS);
      if (!servicesEnabled) {
        setStatus('unavailable');
        return false;
      }

      let permission = await readPermissionStatus();
      if (permission === 'prompt') {
        const { status: requested } = await withTimeout(
          Location.requestForegroundPermissionsAsync(),
          PERMISSION_TIMEOUT_MS,
        );
        if (requested === Location.PermissionStatus.GRANTED) {
          permission = 'granted';
        } else if (requested === Location.PermissionStatus.DENIED) {
          permission = 'denied';
        } else {
          permission = 'prompt';
        }
      }

      if (permission === 'denied') {
        setStatus('denied');
        return false;
      }
      if (permission === 'prompt') {
        setStatus('prompt');
        return false;
      }

      setStatus('granted');
      void refreshPosition();
      void startWatch();
      return true;
    } catch {
      setStatus('prompt');
      return false;
    }
  }, [refreshPosition, startWatch]);

  useEffect(() => {
    if (!enabled) {
      stopWatch();
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const servicesEnabled = await withTimeout(Location.hasServicesEnabledAsync(), PERMISSION_TIMEOUT_MS);
        if (cancelled) return;
        if (!servicesEnabled) {
          setStatus('unavailable');
          return;
        }

        const permission = await readPermissionStatus();
        if (cancelled) return;

        if (permission === 'granted') {
          setStatus('granted');
          void refreshPosition();
          void startWatch();
          return;
        }

        if (permission === 'denied') {
          setStatus('denied');
          return;
        }

        // Undetermined — on web the browser prompt must follow a user tap.
        if (Platform.OS === 'web') {
          setStatus('prompt');
          return;
        }

        await requestPermission();
      } catch {
        if (!cancelled) {
          setStatus('prompt');
        }
      }
    })();

    return () => {
      cancelled = true;
      stopWatch();
    };
  }, [enabled, refreshPosition, requestPermission, startWatch, stopWatch]);

  return {
    location,
    status,
    reduceMotion,
    requestPermission,
  };
}
