import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { buildDemoFestivalNow } from '../utils/demoTime';
import { useAppData } from './DataContext';

export type AppTimeMode = 'real' | 'demo';

const TIME_MODE_KEY = '@uletay_time_mode';

type DemoModeContextValue = {
  mode: AppTimeMode;
  ready: boolean;
  demoNow: Date | null;
  setMode: (mode: AppTimeMode) => Promise<void>;
  getNow: () => Date;
};

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const { data } = useAppData();
  const [mode, setModeState] = useState<AppTimeMode>('real');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(TIME_MODE_KEY).then((value) => {
      setModeState(value === 'demo' ? 'demo' : 'real');
      setReady(true);
    });
  }, []);

  const demoNow = useMemo(
    () => (mode === 'demo' ? buildDemoFestivalNow(data.festival.startDate) : null),
    [data.festival.startDate, mode],
  );

  const setMode = useCallback(async (nextMode: AppTimeMode) => {
    setModeState(nextMode);
    await AsyncStorage.setItem(TIME_MODE_KEY, nextMode);
  }, []);

  const getNow = useCallback(() => demoNow ?? new Date(), [demoNow]);

  const value = useMemo(
    () => ({ mode, ready, demoNow, setMode, getNow }),
    [demoNow, getNow, mode, ready, setMode],
  );

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode(): DemoModeContextValue {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error('useDemoMode must be used within DemoModeProvider');
  }
  return context;
}
