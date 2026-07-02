import { useMemo } from 'react';
import { useAppData } from '../context/DataContext';
import { SchedulePerformance, StageId } from '../types';
import {
  getLivePerformances,
  getPrimaryPerformance,
  isPerformanceLive,
  parseDateTime,
  PrimaryPerformance,
} from '../utils/scheduleHelpers';
import { useNow } from './useNow';

export function useCurrentLivePerformance(
  performanceId?: string,
  stageId?: StageId,
): PrimaryPerformance | null {
  const { data } = useAppData();
  const now = useNow();

  return useMemo(() => {
    if (performanceId) {
      const found = data.schedule.find((item) => item.id === performanceId);
      if (found) {
        if (isPerformanceLive(found, now)) {
          return { performance: found, status: 'live' as const };
        }

        const start = parseDateTime(found.date, found.startTime);
        if (start > now) {
          return { performance: found, status: 'upcoming' as const };
        }
      }
    }

    return getPrimaryPerformance(data.schedule, now, stageId);
  }, [data.schedule, now, performanceId, stageId]);
}

export function useLivePerformances(): SchedulePerformance[] {
  const { data } = useAppData();
  const now = useNow();

  return useMemo(() => getLivePerformances(data.schedule, now), [data.schedule, now]);
}

export function useStagePrimaryPerformances(): PrimaryPerformance[] {
  const { data } = useAppData();
  const now = useNow(1000);

  return useMemo(() => {
    const items = data.stages
      .map((stage) => getPrimaryPerformance(data.schedule, now, stage.id))
      .filter((item): item is PrimaryPerformance => item !== null);

    return items.sort((a, b) => {
      if (a.status === 'live' && b.status !== 'live') {
        return -1;
      }
      if (b.status === 'live' && a.status !== 'live') {
        return 1;
      }

      return (
        parseDateTime(a.performance.date, a.performance.startTime).getTime() -
        parseDateTime(b.performance.date, b.performance.startTime).getTime()
      );
    });
  }, [data.stages, data.schedule, now]);
}

export function useUpcomingPerformances(limit = 3): SchedulePerformance[] {
  const { data } = useAppData();
  const now = useNow();

  return useMemo(() => {
    const liveIds = new Set(getLivePerformances(data.schedule, now).map((item) => item.id));

    return data.schedule
      .filter((item) => !liveIds.has(item.id))
      .filter((item) => parseDateTime(item.date, item.startTime) > now)
      .sort((a, b) => parseDateTime(a.date, a.startTime).getTime() - parseDateTime(b.date, b.startTime).getTime())
      .slice(0, limit);
  }, [data.schedule, now, limit]);
}
