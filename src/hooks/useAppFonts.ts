import { Ionicons } from '@expo/vector-icons';
import { FontDisplay, loadAsync } from 'expo-font';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const nativeFonts={
  FestivalDisplay:require('../../assets/fonts/FestivalDisplay.ttf'),
  FestivalSans:require('../../assets/fonts/FestivalSans.ttf'),
  FestivalSansMedium:require('../../assets/fonts/FestivalSansMedium.ttf'),
  FestivalSansSemiBold:require('../../assets/fonts/FestivalSansSemiBold.ttf'),
  FestivalSansBold:require('../../assets/fonts/FestivalSansBold.ttf'),
  FestivalSansBlack:require('../../assets/fonts/FestivalSansBlack.ttf'),
};

export function useAppFonts() {
  const [iconsReady, setIconsReady] = useState(false);
  const [loaded,setLoaded]=useState(Platform.OS==='web');
  useEffect(() => {
    let active = true;
    void loadAsync({...(Platform.OS!=='web'?nativeFonts:{}),...Object.fromEntries(Object.entries(Ionicons.font).map(([name, uri]) => [
      name, { uri, display: FontDisplay.SWAP },
    ]))}).finally(() => { if (active){setIconsReady(true);setLoaded(true);} }).catch(() => {});
    return () => { active = false; };
  }, []);
  // System typography paints immediately; icon components wait for their font.
  return { loaded, iconsReady, error: null };
}
