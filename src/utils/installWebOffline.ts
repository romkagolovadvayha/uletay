import { Platform } from 'react-native';

const RELOAD_FLAG = 'uletay_sw_reloaded';

function reloadOnceForNewWorker(): void {
  // Avoid reload loops if something goes wrong with SW activation.
  if (sessionStorage.getItem(RELOAD_FLAG) === '1') {
    return;
  }
  sessionStorage.setItem(RELOAD_FLAG, '1');
  window.location.reload();
}

export function installWebOffline(): void {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  window.addEventListener('load', () => {
    void (async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        // New SW finished installing while this tab is open → activate immediately.
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) {
            return;
          }
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              installing.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        // After a new worker takes control, refresh once so JS/HTML match the deploy.
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) {
            return;
          }
          refreshing = true;
          reloadOnceForNewWorker();
        });

        // Periodic + focus checks so phones pick up deploys without a full reinstall.
        const checkForUpdate = () => {
          void registration.update().catch(() => {});
        };
        checkForUpdate();
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            checkForUpdate();
          }
        });
        window.setInterval(checkForUpdate, 60 * 60 * 1000);

        // Clear the one-shot reload guard after a successful controlled load.
        if (navigator.serviceWorker.controller) {
          sessionStorage.removeItem(RELOAD_FLAG);
        }
      } catch {
        // AsyncStorage remains the fallback when service workers are unavailable.
      }
    })();
  }, { once: true });
}
