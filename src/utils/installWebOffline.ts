import { Platform } from 'react-native';

export function installWebOffline(): void {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // AsyncStorage remains the fallback when service workers are unavailable.
    });
  }, { once: true });
}
