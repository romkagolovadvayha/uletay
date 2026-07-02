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

const appFonts = {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  Montserrat_900Black,
  ...Ionicons.font,
};

const FONT_LOAD_TIMEOUT_MS = 8_000;

export function useAppFonts() {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const [loaded, error] = useFonts(appFonts);

  return {
    loaded: timedOut || loaded,
    error,
  };
}
