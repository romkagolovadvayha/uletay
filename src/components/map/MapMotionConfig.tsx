import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

const MapMotionContext = createContext({ reduceMotion: false });

export function MapMotionConfig({ children }: { children: ReactNode }) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  return (
    <MapMotionContext.Provider value={{ reduceMotion }}>{children}</MapMotionContext.Provider>
  );
}

export function useMapMotion() {
  return useContext(MapMotionContext);
}

export function motionDuration(normalMs: number, reduceMotion: boolean): number {
  return reduceMotion ? 0 : normalMs;
}
