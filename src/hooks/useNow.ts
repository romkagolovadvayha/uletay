import { useEffect, useState } from 'react';
import { useClock } from '../context/ClockContext';

const TICK_MS = 30_000;

export function useNow(tickMs = TICK_MS): Date {
  const getNow = useClock();
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), tickMs);
    return () => clearInterval(timer);
  }, [getNow, tickMs]);

  return getNow();
}
