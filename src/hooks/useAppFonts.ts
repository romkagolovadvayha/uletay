import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { FontDisplay, loadAsync, useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const textFontsWithSwap = {
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
  const [iconsReady, setIconsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const [nativeLoaded, nativeError] = useFonts(
    Platform.OS === 'web' ? {} : textFontsWithSwap,
  );

  // Web: load all Montserrat faces immediately (font-display: swap keeps paint unblocked).
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    void loadAsync(textFontsWithSwap).catch(() => {
      // System fallback remains via font-display: swap.
    });
  }, []);

  // Load Ionicons with SWAP ASAP so DeferredIonicons can mount without racing LCP.
  useEffect(() => {
    if (Platform.OS === 'web') {
      void loadAsync(ioniconsWithSwap())
        .then(() => setIconsReady(true))
        .catch(() => setIconsReady(true));
      return;
    }

    if (!nativeLoaded && !timedOut) {
      return;
    }

    void loadAsync(ioniconsWithSwap())
      .then(() => setIconsReady(true))
      .catch(() => setIconsReady(true));
  }, [nativeLoaded, timedOut]);

  return {
    // Web: paint immediately with system fallback + font-display: swap.
    loaded: Platform.OS === 'web' || timedOut || nativeLoaded,
    iconsReady,
    error: nativeError,
  };
}
