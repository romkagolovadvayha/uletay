import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import type { UserLocationState } from '../types/map';

export type LocationStatus = 'loading' | 'granted' | 'denied' | 'unavailable';

const POSITION_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('location-timeout')), ms);
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

export function useUserLocation(enabled = true) {
  const [location, setLocation] = useState<UserLocationState | null>(null);
  const [status, setStatus] = useState<LocationStatus>('loading');
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion);
    } else {
      AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setStatus('unavailable');
        return false;
      }

      let perm = (await Location.getForegroundPermissionsAsync()).status;
      if (perm !== 'granted') {
        perm = (await Location.requestForegroundPermissionsAsync()).status;
      }
      if (perm !== 'granted') {
        setStatus('denied');
        return false;
      }

      setStatus('granted');

      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last) {
          setLocation(toLocationState(last));
        }
      } catch {
        // Last known position is optional.
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
        // GPS fix can be slow indoors; watchPositionAsync may still update later.
      }

      return true;
    } catch {
      setStatus('unavailable');
      return false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    void (async () => {
      const ok = await requestPermission();
      if (!ok || cancelled) return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 4000,
          distanceInterval: 5,
        },
        (update) => {
          setLocation(toLocationState(update));
        },
      );
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled, requestPermission]);

  return {
    location,
    status,
    reduceMotion,
    requestPermission,
  };
}
