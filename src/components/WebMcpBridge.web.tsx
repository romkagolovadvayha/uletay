import { useEffect, useRef } from 'react';
import { useRawAppData } from '../context/DataContext';
import { findModelContext, registerWebMcp } from '../ai/registerWebMcp';

export function WebMcpBridge() {
  const { data, dataSource, lastFetchedAt } = useRawAppData();
  const snapshot = useRef({ data, dataSource, lastFetchedAt });
  useEffect(() => {
    snapshot.current = { data, dataSource, lastFetchedAt };
  }, [data, dataSource, lastFetchedAt]);
  useEffect(() => {
    const registration = registerWebMcp(findModelContext(document, navigator), () => ({
      ...snapshot.current,
      dataSource: snapshot.current.dataSource === 'demo' ? 'fallback' : snapshot.current.dataSource,
    }));
    return () => registration.dispose();
  }, []);
  return null;
}
