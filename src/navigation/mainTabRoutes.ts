import { useMemo } from 'react';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import { useFestivalActive } from '../hooks/useFestivalActive';
import { favoriteKey } from '../utils/favoriteKeys';
import { getFestivalDayDate } from '../utils/festivalTime';
import { RootTabParamList } from './types';

export type MainTabContentFlags = {
  hasSchedule: boolean;
  hasAutographs: boolean;
  hasFavorites: boolean;
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

/** Хэдлайнеры в «Ещё», только пока внизу уже есть живое расписание/автографы. */
export function shouldPutHeadlinersInMoreTab(
  festivalActive: boolean,
  content: MainTabContentFlags,
): boolean {
  return festivalActive && (content.hasSchedule || content.hasAutographs);
}

export function getVisibleMainTabRoutes(
  festivalActive: boolean,
  content: MainTabContentFlags,
): (keyof RootTabParamList)[] {
  const routes: (keyof RootTabParamList)[] = ['HomeTab', 'MapTab'];

  if (content.hasSchedule) {
    routes.push('ScheduleTab');
  }
  if (content.hasAutographs) {
    routes.push('Autographs');
  }
  if (festivalActive && content.hasFavorites) {
    routes.push('FavoritesTab');
  }

  // Пока нет расписания/автографов (или фестиваль уже закончился) — хэдлайнеры в нижнем меню.
  if (!shouldPutHeadlinersInMoreTab(festivalActive, content)) {
    routes.push('HeadlinersTab');
  }

  routes.push('PlaylistTab');
  return routes;
}

export function useMainTabContentFlags(): MainTabContentFlags {
  const { data } = useAppData();
  const { favorites, isReady } = useFavorites();

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
    const hasFavorites =
      isReady &&
      (scheduleInWindow.some((item) => favorites.includes(favoriteKey('performance', item.id))) ||
        autographsInWindow.some((item) => favorites.includes(favoriteKey('autograph', item.id))));

    return { hasSchedule, hasAutographs, hasFavorites };
  }, [data.autographs, data.festival, data.schedule, favorites, isReady]);
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
  const content = useMainTabContentFlags();

  return useMemo(
    () => shouldPutHeadlinersInMoreTab(festivalActive, content),
    [content, festivalActive],
  );
}
