import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const DEMO_LIVE_KEY = '@uletay_demo_live';

export function useDemoLive() {
  const [demoLiveEnabled, setDemoLiveEnabledState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DEMO_LIVE_KEY).then((value) => {
      if (value === null) {
        setDemoLiveEnabledState(true);
        void AsyncStorage.setItem(DEMO_LIVE_KEY, '1');
        return;
      }
      setDemoLiveEnabledState(value === '1');
    });
  }, []);

  const setDemoLiveEnabled = useCallback(async (value: boolean) => {
    setDemoLiveEnabledState(value);
    await AsyncStorage.setItem(DEMO_LIVE_KEY, value ? '1' : '0');
  }, []);

  return { demoLiveEnabled, setDemoLiveEnabled };
}
