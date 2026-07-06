import { useEffect, useRef } from 'react';

/** Keeps a ref synced with the latest value without updating during render. */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
