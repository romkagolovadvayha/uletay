import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useFestivalActive } from '../hooks/useFestivalActive';
import { navigationRef } from './navigationRef';
import { RootTabParamList } from './types';

const FESTIVAL_ONLY_TABS: (keyof RootTabParamList)[] = [
  'ScheduleTab',
  'Autographs',
  'FavoritesTab',
];

const POST_FESTIVAL_ONLY_TABS: (keyof RootTabParamList)[] = ['HeadlinersTab'];

const FESTIVAL_ONLY_MORE_ROUTES = new Set(['FoodCourtMain', 'FoodCourtDetail']);

function readGuardState(): {
  currentTab: keyof RootTabParamList | undefined;
  moreNestedRoute: string | null;
} {
  if (!navigationRef.isReady()) {
    return { currentTab: undefined, moreNestedRoute: null };
  }

  const state = navigationRef.getRootState();
  const route = state.routes[state.index];
  const currentTab = route?.name as keyof RootTabParamList | undefined;

  if (route?.name !== 'MoreTab' || !route.state) {
    return { currentTab, moreNestedRoute: null };
  }

  return {
    currentTab,
    moreNestedRoute: route.state.routes[route.state.index ?? 0]?.name ?? null,
  };
}

function shouldRedirect(
  festivalActive: boolean,
  currentTab: keyof RootTabParamList | undefined,
  moreNestedRoute: string | null,
): boolean {
  if (!currentTab) {
    return false;
  }

  const shouldLeaveTab =
    (!festivalActive && FESTIVAL_ONLY_TABS.includes(currentTab)) ||
    (festivalActive && POST_FESTIVAL_ONLY_TABS.includes(currentTab));

  const shouldLeaveMore =
    !festivalActive &&
    currentTab === 'MoreTab' &&
    moreNestedRoute != null &&
    FESTIVAL_ONLY_MORE_ROUTES.has(moreNestedRoute);

  return shouldLeaveTab || shouldLeaveMore;
}

export function FestivalNavigationGuard() {
  const festivalActive = useFestivalActive();
  const [navRevision, setNavRevision] = useState(0);

  useEffect(() => {
    if (!navigationRef.isReady()) {
      return undefined;
    }

    const sync = () => setNavRevision((revision) => revision + 1);
    sync();
    return navigationRef.addListener('state', sync);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const { currentTab, moreNestedRoute } = readGuardState();
    if (shouldRedirect(festivalActive, currentTab, moreNestedRoute) && navigationRef.isReady()) {
      navigationRef.navigate('HomeTab');
    }
  }, [festivalActive, navRevision]);

  return null;
}
