import { useMemo } from 'react';
import { useAppData } from '../context/DataContext';
import { AutographSession, StageId } from '../types';
import {
  getLiveAutographSessions,
  getPrimaryAutograph,
  PrimaryAutograph,
} from '../utils/scheduleHelpers';
import { useNow } from './useNow';

export function usePrimaryAutograph(stageId?: StageId): PrimaryAutograph | null {
  const { data } = useAppData();
  const now = useNow();

  return useMemo(() => getPrimaryAutograph(data.autographs, now, stageId), [data.autographs, now, stageId]);
}

export function useLiveAutographs(stageId?: StageId): AutographSession[] {
  const { data } = useAppData();
  const now = useNow();

  return useMemo(() => {
    const scoped = stageId ? data.autographs.filter((item) => item.stageId === stageId) : data.autographs;
    return getLiveAutographSessions(scoped, now);
  }, [data.autographs, now, stageId]);
}
