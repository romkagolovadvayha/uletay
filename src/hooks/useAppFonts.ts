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
import { Platform } from 'react-native';
import { ensureMontserratStylesheet, IONICONS_FONT_URI } from '../utils/webFonts';

const nativeFonts = {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  Montserrat_900Black,
  ...Ionicons.font,
};

export function useAppFonts() {
  const [webMontserratReady, setWebMontserratReady] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    let active = true;
    void ensureMontserratStylesheet()
      .then(() => {
        if (active) {
          setWebMontserratReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setWebMontserratReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const [loaded, error] = useFonts(
    Platform.OS === 'web'
      ? { ionicons: { uri: IONICONS_FONT_URI } }
      : nativeFonts,
  );

  const fontsReady = Platform.OS === 'web' ? webMontserratReady && loaded : loaded;

  return {
    loaded: fontsReady,
    error,
  };
};
