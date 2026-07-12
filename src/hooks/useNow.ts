import { useEffect, useState } from 'react';
import { useDemoMode } from '../context/DemoModeContext';

const TICK_MS = 30_000;

export function useNow(tickMs = TICK_MS): Date {
  const { getNow } = useDemoMode();
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), tickMs);
    return () => clearInterval(timer);
  }, [getNow, tickMs]);

  return getNow();
}
