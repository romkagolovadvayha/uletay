import { Platform } from 'react-native';

const RELOAD_FLAG = 'uletay_sw_reloaded';
const LOCAL_CLEANUP_RELOAD_FLAG = 'uletay_local_sw_cleanup_reloaded';
const APP_CACHE_PREFIX = 'uletay-';
let installed = false;

function isLoopbackHostname(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
}

function afterPageLoad(callback: () => void): void {
  if (document.readyState === 'complete') callback();
  else window.addEventListener('load', callback, { once: true });
}

function reloadOnceForNewWorker(): void {
  // Avoid reload loops if something goes wrong with SW activation.
  if (sessionStorage.getItem(RELOAD_FLAG) === '1') {
    return;
  }
  sessionStorage.setItem(RELOAD_FLAG, '1');
  window.location.reload();
}

async function disableLocalServiceWorker(): Promise<void> {
  const hadController = Boolean(navigator.serviceWorker.controller);

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    // A browser may expose serviceWorker but block registration access.
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(APP_CACHE_PREFIX))
          .map((key) => caches.delete(key)),
      );
    }
  } catch {
    // Cache Storage may be unavailable in private modes.
  }

  try {
    if (hadController && sessionStorage.getItem(LOCAL_CLEANUP_RELOAD_FLAG) !== '1') {
      sessionStorage.setItem(LOCAL_CLEANUP_RELOAD_FLAG, '1');
      window.location.reload();
      return;
    }
    if (!hadController) {
      sessionStorage.removeItem(LOCAL_CLEANUP_RELOAD_FLAG);
    }
  } catch {
    // Storage may be blocked; cleanup still succeeded without an automatic reload.
  }
}

export function installWebOffline(): void {
  if (
    installed || Platform.OS !== 'web' ||
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return;
  }
  installed = true;

  if (isLoopbackHostname(window.location.hostname)) {
    afterPageLoad(() => {
      void disableLocalServiceWorker();
    });
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  afterPageLoad(() => {
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
  });
}
