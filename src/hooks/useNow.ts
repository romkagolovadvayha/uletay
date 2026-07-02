import { useEffect, useState } from 'react';

const TICK_MS = 30_000;

export function useNow(tickMs = TICK_MS): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), tickMs);
    return () => clearInterval(timer);
  }, [tickMs]);

  return now;
}
