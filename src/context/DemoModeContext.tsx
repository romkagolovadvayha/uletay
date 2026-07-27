import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppData } from '../types';
import { buildDemoAppData, getDemoNowFromData } from '../utils/demoData';
import { describeDemoFestivalMoment, resolveDemoFestivalWindow } from '../utils/demoTime';
import { DataContext, useRawAppData } from './DataContext';

export type AppTimeMode = 'real' | 'demo';

const TIME_MODE_KEY = '@uletay_time_mode';

type DemoModeContextValue = {
  mode: AppTimeMode;
  ready: boolean;
  demoNow: Date | null;
  demoDescription: string;
  setMode: (mode: AppTimeMode) => Promise<void>;
  getNow: () => Date;
};

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const raw = useRawAppData();
  const [mode, setModeState] = useState<AppTimeMode>('real');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(TIME_MODE_KEY).then((value) => {
      setModeState(value === 'demo' ? 'demo' : 'real');
      setReady(true);
    });
  }, []);

  const demoData = useMemo(
    () => (mode === 'demo' ? buildDemoAppData(raw.data, new Date()) : null),
    [mode, raw.data],
  );

  const demoNow = useMemo(
    () => (mode === 'demo' ? getDemoNowFromData(raw.data, new Date()) : null),
    [mode, raw.data],
  );

  const demoDescription = useMemo(() => {
    const window = resolveDemoFestivalWindow(raw.data.festival, new Date());
    return describeDemoFestivalMoment(window.startDate, window.endDate);
  }, [raw.data.festival]);

  const setMode = useCallback(async (nextMode: AppTimeMode) => {
    setModeState(nextMode);
    await AsyncStorage.setItem(TIME_MODE_KEY, nextMode);
  }, []);

  const getNow = useCallback(() => demoNow ?? new Date(), [demoNow]);

  const value = useMemo(
    () => ({ mode, ready, demoNow, demoDescription, setMode, getNow }),
    [demoDescription, demoNow, getNow, mode, ready, setMode],
  );

  const dataValue = useMemo(() => {
    if (!demoData) {
      return raw;
    }
    return {
      ...raw,
      data: demoData as AppData,
      dataSource: 'demo' as const,
      error: null,
    };
  }, [demoData, raw]);

  return (
    <DemoModeContext.Provider value={value}>
      <DataContext.Provider value={dataValue}>{children}</DataContext.Provider>
    </DemoModeContext.Provider>
  );
}

export function useDemoMode(): DemoModeContextValue {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error('useDemoMode must be used within DemoModeProvider');
  }
  return context;
}
