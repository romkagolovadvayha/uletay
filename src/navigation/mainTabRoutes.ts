import { useMemo } from 'react';
import { useAppData } from '../context/DataContext';
import { useFestivalActive } from '../hooks/useFestivalActive';
import { getFestivalDayDate } from '../utils/festivalTime';
import { RootTabParamList } from './types';

export type MainTabContentFlags = {
  hasSchedule: boolean;
  hasAutographs: boolean;
};

function isInFestivalWindow(
  date: string,
  startTime: string,
  startDate: string,
  endDate: string,
): boolean {
  const festivalDay = getFestivalDayDate(date, startTime);
  return festivalDay >= startDate && festivalDay <= endDate;
}

export function shouldPutHeadlinersInMoreTab(_festivalActive: boolean): boolean {
  return false;
}

export function getVisibleMainTabRoutes(
  festivalActive: boolean,
  content: MainTabContentFlags,
): (keyof RootTabParamList)[] {
  if (festivalActive) {
    const festivalRoutes: (keyof RootTabParamList)[] = ['HomeTab'];
    if (content.hasSchedule) {
      festivalRoutes.push('ScheduleTab');
    }
    festivalRoutes.push('MapTab', 'FavoritesTab', 'HeadlinersTab', 'PlaylistTab');
    return festivalRoutes;
  }

  const routes: (keyof RootTabParamList)[] = ['HomeTab', 'MapTab'];

  if (content.hasSchedule) {
    routes.push('ScheduleTab');
  }
  if (content.hasAutographs) {
    routes.push('Autographs');
  }
  // Вне фестиваля хэдлайнеры остаются отдельным основным разделом.
  if (!shouldPutHeadlinersInMoreTab(festivalActive)) {
    routes.push('HeadlinersTab');
  }

  routes.push('PlaylistTab');
  return routes;
}

export function useMainTabContentFlags(): MainTabContentFlags {
  const { data } = useAppData();

  return useMemo(() => {
    const { startDate, endDate } = data.festival;

    const scheduleInWindow = data.schedule.filter((item) =>
      isInFestivalWindow(item.date, item.startTime, startDate, endDate),
    );
    const autographsInWindow = data.autographs.filter((item) =>
      isInFestivalWindow(item.date, item.startTime, startDate, endDate),
    );

    const hasSchedule = scheduleInWindow.length > 0;
    const hasAutographs = autographsInWindow.length > 0;

    return { hasSchedule, hasAutographs };
  }, [data.autographs, data.festival, data.schedule]);
}

export function useVisibleMainTabRoutes(): (keyof RootTabParamList)[] {
  const festivalActive = useFestivalActive();
  const content = useMainTabContentFlags();

  return useMemo(
    () => getVisibleMainTabRoutes(festivalActive, content),
    [content, festivalActive],
  );
}

export function useHeadlinersInMoreTab(): boolean {
  const festivalActive = useFestivalActive();

  return useMemo(
    () => shouldPutHeadlinersInMoreTab(festivalActive),
    [festivalActive],
  );
}
