import { useMemo } from 'react';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import { useFestivalActive } from '../hooks/useFestivalActive';
import { favoriteKey } from '../utils/favoriteKeys';
import { RootTabParamList } from './types';

export const MAIN_TAB_ROUTES_ACTIVE: (keyof RootTabParamList)[] = [
  'HomeTab',
  'MapTab',
  'ScheduleTab',
  'Autographs',
  'FavoritesTab',
  'PlaylistTab',
];

export const MAIN_TAB_ROUTES_FINISHED: (keyof RootTabParamList)[] = [
  'HomeTab',
  'MapTab',
  'HeadlinersTab',
  'PlaylistTab',
];

export type MainTabContentFlags = {
  hasSchedule: boolean;
  hasAutographs: boolean;
  hasFavorites: boolean;
};

export function getVisibleMainTabRoutes(
  festivalActive: boolean,
  content: MainTabContentFlags,
): (keyof RootTabParamList)[] {
  const base = festivalActive ? MAIN_TAB_ROUTES_ACTIVE : MAIN_TAB_ROUTES_FINISHED;

  return base.filter((name) => {
    if (name === 'ScheduleTab') {
      return content.hasSchedule;
    }
    if (name === 'Autographs') {
      return content.hasAutographs;
    }
    if (name === 'FavoritesTab') {
      return content.hasFavorites;
    }
    return true;
  });
}

export function useMainTabContentFlags(): MainTabContentFlags {
  const { data } = useAppData();
  const { favorites, isReady } = useFavorites();

  return useMemo(() => {
    const hasSchedule = data.schedule.length > 0;
    const hasAutographs = data.autographs.length > 0;
    const hasFavorites =
      isReady &&
      (data.schedule.some((item) => favorites.includes(favoriteKey('performance', item.id))) ||
        data.autographs.some((item) => favorites.includes(favoriteKey('autograph', item.id))));

    return { hasSchedule, hasAutographs, hasFavorites };
  }, [data.autographs, data.schedule, favorites, isReady]);
}

export function useVisibleMainTabRoutes(): (keyof RootTabParamList)[] {
  const festivalActive = useFestivalActive();
  const content = useMainTabContentFlags();

  return useMemo(
    () => getVisibleMainTabRoutes(festivalActive, content),
    [content, festivalActive],
  );
}
