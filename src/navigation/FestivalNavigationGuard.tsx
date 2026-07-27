import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { useFestivalActive } from '../hooks/useFestivalActive';
import {
  getVisibleMainTabRoutes,
  useMainTabContentFlags,
} from './mainTabRoutes';
import { navigationRef } from './navigationRef';
import { RootTabParamList } from './types';

const FESTIVAL_ONLY_MORE_ROUTES = new Set(['FoodCourtMain', 'FoodCourtDetail']);

const POST_FESTIVAL_ONLY_TABS: (keyof RootTabParamList)[] = ['HeadlinersTab'];

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
  visibleTabs: ReadonlySet<keyof RootTabParamList>,
  currentTab: keyof RootTabParamList | undefined,
  moreNestedRoute: string | null,
): boolean {
  if (!currentTab) {
    return false;
  }

  const shouldLeaveTab =
    (!visibleTabs.has(currentTab) && currentTab !== 'MoreTab') ||
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
  const content = useMainTabContentFlags();
  const [navRevision, setNavRevision] = useState(0);

  const visibleTabs = useMemo(
    () => new Set(getVisibleMainTabRoutes(festivalActive, content)),
    [content, festivalActive],
  );

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
    if (
      shouldRedirect(festivalActive, visibleTabs, currentTab, moreNestedRoute) &&
      navigationRef.isReady()
    ) {
      navigationRef.navigate('HomeTab');
    }
  }, [festivalActive, navRevision, visibleTabs]);

  return null;
}
