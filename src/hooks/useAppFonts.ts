import { Platform } from 'react-native';
import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  Montserrat_900Black,
  useFonts,
} from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ensureMontserratStylesheet, IONICONS_FONT_URI } from '../utils/webFonts';

const nativeFonts = {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  Montserrat_900Black,
};

const FONT_LOAD_TIMEOUT_MS = 4_000;

export function useAppFonts() {
  const [webMontserratReady, setWebMontserratReady] = useState(Platform.OS !== 'web');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      if (active) {
        setWebMontserratReady(true);
      }
    }, FONT_LOAD_TIMEOUT_MS);

    void ensureMontserratStylesheet(FONT_LOAD_TIMEOUT_MS)
      .then(() => {
        if (active) {
          setWebMontserratReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setWebMontserratReady(true);
        }
      })
      .finally(() => clearTimeout(timer));

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  const [loaded, error] = useFonts({
    ...(Platform.OS === 'web' ? {} : nativeFonts),
    ...(Platform.OS === 'web'
      ? { ionicons: { uri: IONICONS_FONT_URI } }
      : Ionicons.font),
  });

  const fontsReady = timedOut || (loaded && webMontserratReady);

  return {
    loaded: fontsReady,
    error,
  };
}
