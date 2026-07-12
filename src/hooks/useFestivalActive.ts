import { useMemo } from 'react';
import { useAppData } from '../context/DataContext';
import { isFestivalFinished } from '../utils/scheduleHelpers';
import { useNow } from './useNow';

export function useFestivalActive(): boolean {
  const { data } = useAppData();
  const now = useNow();

  return useMemo(
    () =>
      !isFestivalFinished(
        data.festival.startDate,
        data.festival.endDate,
        data.schedule,
        now,
      ),
    [data.festival.endDate, data.festival.startDate, data.schedule, now],
  );
}
