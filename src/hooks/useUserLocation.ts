import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import type { UserLocationState } from '../types/map';

export type LocationStatus = 'loading' | 'granted' | 'denied' | 'prompt' | 'unavailable';

const POSITION_TIMEOUT_MS = 20_000;
const WEB_PROBE_TIMEOUT_MS = 10_000;

function toLocationState(position: Location.LocationObject): UserLocationState {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
}

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

async function probeWebLocationAccess(): Promise<'granted' | 'denied' | 'prompt'> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.geolocation) {
    return 'prompt';
  }

  try {
    const last = await Location.getLastKnownPositionAsync();
    if (last) return 'granted';
  } catch {
    // Optional cache.
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve('denied');
          return;
        }
        resolve('prompt');
      },
      {
        maximumAge: 300_000,
        timeout: WEB_PROBE_TIMEOUT_MS,
        enableHighAccuracy: false,
      },
    );
  });
}

async function readPermissionStatus(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === Location.PermissionStatus.GRANTED) return 'granted';
    if (status === Location.PermissionStatus.DENIED) return 'denied';
  } catch {
    // Safari and some browsers do not expose navigator.permissions for geolocation.
  }

  if (Platform.OS === 'web') {
    return probeWebLocationAccess();
  }

  return 'prompt';
}

async function requestForegroundPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === Location.PermissionStatus.GRANTED) return 'granted';
    if (status === Location.PermissionStatus.DENIED) return 'denied';
  } catch {
    // Fall through to probe on web.
  }

  if (Platform.OS === 'web') {
    return probeWebLocationAccess();
  }

  return 'prompt';
}

export function useUserLocation(enabled = true) {
  const [location, setLocation] = useState<UserLocationState | null>(null);
  const [status, setStatus] = useState<LocationStatus>('loading');
  const [reduceMotion, setReduceMotion] = useState(false);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const statusRef = useRef<LocationStatus>('loading');

  const setStatusSafe = useCallback((next: LocationStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

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
    try {
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
    } catch {
      // watchPosition can fail on web without a fresh user gesture.
    }
  }, [stopWatch]);

  const activateGranted = useCallback(async () => {
    setStatusSafe('granted');
    await refreshPosition();
    await startWatch();
  }, [refreshPosition, setStatusSafe, startWatch]);

  const requestPermission = useCallback(async () => {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setStatusSafe('unavailable');
        return false;
      }

      let permission = await readPermissionStatus();
      if (permission === 'prompt') {
        permission = await requestForegroundPermission();
      }

      if (permission === 'denied') {
        setStatusSafe('denied');
        return false;
      }
      if (permission === 'prompt') {
        setStatusSafe('prompt');
        return false;
      }

      await activateGranted();
      return true;
    } catch {
      if (Platform.OS === 'web') {
        const probe = await probeWebLocationAccess();
        if (probe === 'granted') {
          await activateGranted();
          return true;
        }
        if (probe === 'denied') {
          setStatusSafe('denied');
          return false;
        }
      }
      setStatusSafe(statusRef.current === 'granted' ? 'granted' : 'prompt');
      return false;
    }
  }, [activateGranted, setStatusSafe]);

  useEffect(() => {
    if (!enabled) {
      stopWatch();
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (cancelled) return;
        if (!servicesEnabled) {
          setStatusSafe('unavailable');
          return;
        }

        let permission = await readPermissionStatus();
        if (cancelled) return;

        if (permission === 'prompt' && Platform.OS !== 'web') {
          permission = await requestForegroundPermission();
          if (cancelled) return;
        }

        if (permission === 'granted') {
          await activateGranted();
          return;
        }

        if (permission === 'denied') {
          setStatusSafe('denied');
          return;
        }

        setStatusSafe('prompt');
      } catch {
        if (cancelled) return;

        if (Platform.OS === 'web') {
          const probe = await probeWebLocationAccess();
          if (cancelled) return;
          if (probe === 'granted') {
            await activateGranted();
            return;
          }
          if (probe === 'denied') {
            setStatusSafe('denied');
            return;
          }
        }

        setStatusSafe(statusRef.current === 'granted' ? 'granted' : 'prompt');
      }
    })();

    return () => {
      cancelled = true;
      stopWatch();
    };
  }, [activateGranted, enabled, setStatusSafe, stopWatch]);

  return {
    location,
    status,
    reduceMotion,
    requestPermission,
  };
}
