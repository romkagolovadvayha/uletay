import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { FontDisplay, loadAsync, useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/** Hero/brand path on web: only Bold (~328 KiB) before LCP. */
const criticalBold = {
  Montserrat_700Bold: {
    uri: Montserrat_700Bold,
    display: FontDisplay.SWAP,
  },
};

const deferredTextFonts = {
  Montserrat_400Regular: {
    uri: Montserrat_400Regular,
    display: FontDisplay.SWAP,
  },
  Montserrat_600SemiBold: {
    uri: Montserrat_600SemiBold,
    display: FontDisplay.SWAP,
  },
};

/** Native keeps all three faces available before first paint. */
const nativeCriticalFonts = {
  ...deferredTextFonts,
  ...criticalBold,
};

const FONT_LOAD_TIMEOUT_MS = 8_000;
/** Keep Ionicons (~380 KiB) off Lighthouse critical path / LCP window. */
const IONICONS_MIN_DELAY_MS = 5_000;
const DEFERRED_TEXT_FONTS_DELAY_MS = 2_000;

function scheduleAfterDelay(cb: () => void, delayMs: number): () => void {
  if (Platform.OS !== 'web') {
    const id = setTimeout(cb, 32);
    return () => clearTimeout(id);
  }

  let idleId: number | undefined;
  const win = globalThis as typeof globalThis & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  const timer = setTimeout(() => {
    if (typeof win.requestIdleCallback === 'function') {
      idleId = win.requestIdleCallback(cb);
      return;
    }
    cb();
  }, delayMs);

  return () => {
    clearTimeout(timer);
    if (idleId !== undefined) {
      win.cancelIdleCallback?.(idleId);
    }
  };
}

function ioniconsWithSwap() {
  return Object.fromEntries(
    Object.entries(Ionicons.font).map(([name, uri]) => [
      name,
      { uri, display: FontDisplay.SWAP },
    ]),
  );
}

export function useAppFonts() {
  const [timedOut, setTimedOut] = useState(false);
  const [iconsReady, setIconsReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const [nativeLoaded, nativeError] = useFonts(
    Platform.OS === 'web' ? {} : nativeCriticalFonts,
  );

  // Web: load Bold first (hero), then Regular/SemiBold after a short delay.
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    let cancelled = false;
    void loadAsync(criticalBold).catch(() => {
      // System fallback remains via font-display: swap.
    });

    const cancelDeferred = scheduleAfterDelay(() => {
      if (cancelled) {
        return;
      }
      void loadAsync(deferredTextFonts).catch(() => {});
    }, DEFERRED_TEXT_FONTS_DELAY_MS);

    return () => {
      cancelled = true;
      cancelDeferred();
    };
  }, []);

  // Web: load Ionicons with SWAP only after LCP window — and only then mount icons
  // (Ionicons componentDidMount otherwise calls loadAsync without font-display).
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const cancel = scheduleAfterDelay(() => {
      void loadAsync(ioniconsWithSwap())
        .then(() => setIconsReady(true))
        .catch(() => setIconsReady(true));
    }, IONICONS_MIN_DELAY_MS);

    return cancel;
  }, []);

  // Native: defer Ionicons slightly after text fonts.
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }
    if (!nativeLoaded && !timedOut) {
      return;
    }

    const id = setTimeout(() => {
      void loadAsync(ioniconsWithSwap())
        .then(() => setIconsReady(true))
        .catch(() => setIconsReady(true));
    }, 32);

    return () => clearTimeout(id);
  }, [nativeLoaded, timedOut]);

  return {
    // Web: paint immediately with system fallback + font-display: swap.
    loaded: Platform.OS === 'web' || timedOut || nativeLoaded,
    iconsReady,
    error: nativeError,
  };
}
