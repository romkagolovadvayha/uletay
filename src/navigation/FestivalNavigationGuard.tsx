import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useEffect } from 'react';
import { useFestivalActive } from '../hooks/useFestivalActive';
import { RootTabParamList } from '../navigation/types';

const FESTIVAL_ONLY_TABS: (keyof RootTabParamList)[] = [
  'ScheduleTab',
  'Autographs',
  'FavoritesTab',
];

const POST_FESTIVAL_ONLY_TABS: (keyof RootTabParamList)[] = ['HeadlinersTab'];

const FESTIVAL_ONLY_MORE_ROUTES = new Set(['FoodCourtMain', 'FoodCourtDetail']);

export function FestivalNavigationGuard() {
  const navigation = useNavigation();
  const festivalActive = useFestivalActive();
  const currentTab = useNavigationState((state) => {
    const route = state?.routes[state.index];
    return route?.name as keyof RootTabParamList | undefined;
  });
  const moreNestedRoute = useNavigationState((state) => {
    const route = state?.routes[state.index];
    if (route?.name !== 'MoreTab' || !route.state) {
      return null;
    }
    return route.state.routes[route.state.index ?? 0]?.name ?? null;
  });

  useEffect(() => {
    if (!currentTab) {
      return;
    }

    const shouldLeaveTab =
      (!festivalActive && FESTIVAL_ONLY_TABS.includes(currentTab)) ||
      (festivalActive && POST_FESTIVAL_ONLY_TABS.includes(currentTab));

    const shouldLeaveMore =
      !festivalActive &&
      currentTab === 'MoreTab' &&
      moreNestedRoute != null &&
      FESTIVAL_ONLY_MORE_ROUTES.has(moreNestedRoute);

    if (shouldLeaveTab || shouldLeaveMore) {
      navigation.navigate('HomeTab');
    }
  }, [currentTab, festivalActive, moreNestedRoute, navigation]);

  return null;
}
