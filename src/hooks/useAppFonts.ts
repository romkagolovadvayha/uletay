import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { FontDisplay, loadAsync, useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/** Only 3 faces on the critical path (~1 MB instead of ~2.3 MB + Ionicons). */
const criticalFonts = {
  Montserrat_400Regular: {
    uri: Montserrat_400Regular,
    display: FontDisplay.SWAP,
  },
  Montserrat_600SemiBold: {
    uri: Montserrat_600SemiBold,
    display: FontDisplay.SWAP,
  },
  Montserrat_700Bold: {
    uri: Montserrat_700Bold,
    display: FontDisplay.SWAP,
  },
};

const FONT_LOAD_TIMEOUT_MS = 8_000;

function scheduleDeferred(cb: () => void): () => void {
  if (Platform.OS === 'web' && typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(cb, { timeout: 1500 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(cb, Platform.OS === 'web' ? 0 : 32);
  return () => clearTimeout(id);
}

export function useAppFonts() {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const [loaded, error] = useFonts(criticalFonts);

  // Ionicons (~380 KiB) must not compete with LCP text fonts.
  useEffect(() => {
    if (!loaded && !timedOut) {
      return;
    }

    const cancel = scheduleDeferred(() => {
      const ioniconsWithSwap = Object.fromEntries(
        Object.entries(Ionicons.font).map(([name, uri]) => [
          name,
          { uri, display: FontDisplay.SWAP },
        ]),
      );
      void loadAsync(ioniconsWithSwap).catch(() => {
        // Icons may briefly fall back; app UI remains usable.
      });
    });

    return cancel;
  }, [loaded, timedOut]);

  return {
    // Web: paint immediately with system fallback + font-display: swap.
    loaded: Platform.OS === 'web' || timedOut || loaded,
    error,
  };
}
