import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { APP_DATA_CACHE_KEY, invalidateAppDataCache } from '../api/appDataApi';

const LEGACY_APP_DATA_KEY = '@uletay_app_data_v1';
const SW_RELOAD_FLAG = 'uletay_sw_reloaded';

/**
 * Clears offline schedule/API cache and (on web) service-worker caches.
 * Does not touch favorites, demo mode, or notification preferences.
 * On web, reloads the page so a fresh SW and bundle can load.
 */
export async function clearOfflineAppCache(options?: { reload?: boolean }): Promise<void> {
  const shouldReload = options?.reload ?? Platform.OS === 'web';

  invalidateAppDataCache();

  await AsyncStorage.multiRemove([APP_DATA_CACHE_KEY, LEGACY_APP_DATA_KEY]);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      window.localStorage?.removeItem(APP_DATA_CACHE_KEY);
      window.localStorage?.removeItem(LEGACY_APP_DATA_KEY);
      window.sessionStorage?.removeItem(SW_RELOAD_FLAG);
    } catch {
      // Storage may be blocked in private modes.
    }

    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {
      // Cache Storage unavailable.
    }

    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_CACHES' });
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    } catch {
      // SW APIs unavailable.
    }

    if (shouldReload) {
      window.location.reload();
    }
  }
}
