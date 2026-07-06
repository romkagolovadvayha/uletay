import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import type { UserLocationState } from '../types/map';

export type LocationStatus = 'loading' | 'granted' | 'denied' | 'unavailable';

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
    setStatus('loading');
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setStatus('denied');
        return false;
      }
      setStatus('granted');
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        lat: current.coords.latitude,
        lng: current.coords.longitude,
        accuracy: current.coords.accuracy,
      });
      return true;
    } catch {
      setStatus('unavailable');
      return false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const ok = await requestPermission();
      if (!ok) return;
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 4000,
          distanceInterval: 5,
        },
        (update) => {
          setLocation({
            lat: update.coords.latitude,
            lng: update.coords.longitude,
            accuracy: update.coords.accuracy,
          });
        },
      );
    })();

    return () => {
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
