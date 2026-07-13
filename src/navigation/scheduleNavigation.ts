import { CommonActions, NavigationProp, StackActions } from '@react-navigation/native';
import { RootTabParamList, ScheduleStackParamList } from './types';

type NestedTabName = 'ScheduleTab' | 'Autographs' | 'HeadlinersTab' | 'MoreTab';

const NESTED_TABS: NestedTabName[] = ['ScheduleTab', 'Autographs', 'HeadlinersTab', 'MoreTab'];

type NestedStackState = {
  key?: string;
  index?: number;
  routes: { name: string }[];
};

type RootTabNavigation = {
  getState(): {
    index?: number;
    routes: { name: string; state?: NestedStackState }[];
  };
  dispatch: NavigationProp<RootTabParamList>['dispatch'];
};

function getTabMainRoute(tabName: NestedTabName): string {
  switch (tabName) {
    case 'ScheduleTab':
      return 'ScheduleMain';
    case 'Autographs':
      return 'AutographsMain';
    case 'HeadlinersTab':
      return 'HeadlinersMain';
    case 'MoreTab':
      return 'MoreHome';
  }
}

export function popTabStackToMain(
  navigation: RootTabNavigation,
  tabName: NestedTabName,
) {
  const state = navigation.getState();
  const nestedState = state.routes.find((route) => route.name === tabName)?.state;

  if (!nestedState?.key) {
    return;
  }

  const nestedIndex = nestedState.index ?? 0;
  const mainRoute = getTabMainRoute(tabName);
  const currentRoute = nestedState.routes[nestedIndex]?.name;

  if (!currentRoute || currentRoute === mainRoute) {
    return;
  }

  if (nestedIndex > 0) {
    navigation.dispatch({
      ...StackActions.popToTop(),
      target: nestedState.key,
    });
    return;
  }

  navigation.dispatch({
    ...CommonActions.reset({
      index: 0,
      routes: [{ name: mainRoute }],
    }),
    target: nestedState.key,
  });
}

export function popScheduleStackToMain(navigation: RootTabNavigation) {
  popTabStackToMain(navigation, 'ScheduleTab');
}

export function popAutographStackToMain(navigation: RootTabNavigation) {
  popTabStackToMain(navigation, 'Autographs');
}

export function popMoreStackToMain(navigation: RootTabNavigation) {
  popTabStackToMain(navigation, 'MoreTab');
}

export function resetAllNestedTabStacks(navigation: RootTabNavigation) {
  for (const tabName of NESTED_TABS) {
    popTabStackToMain(navigation, tabName);
  }
}

export function popInactiveNestedTabStacks(
  navigation: RootTabNavigation,
  activeTabName?: string,
) {
  for (const tabName of NESTED_TABS) {
    if (tabName !== activeTabName) {
      popTabStackToMain(navigation, tabName);
    }
  }
}

export function syncNestedStacksWithActiveTab(navigation: RootTabNavigation) {
  const state = navigation.getState();
  const activeTabName = state.routes[state.index ?? 0]?.name;
  popInactiveNestedTabStacks(navigation, activeTabName);
}

export function openScheduleTabMain(navigation: NavigationProp<RootTabParamList>) {
  navigation.navigate('ScheduleTab', { screen: 'ScheduleMain' });
  popScheduleStackToMain(navigation);
}

export function openAutographsMain(navigation: NavigationProp<RootTabParamList>) {
  navigation.navigate('Autographs', { screen: 'AutographsMain' });
  popAutographStackToMain(navigation);
}

export function openMoreHome(navigation: NavigationProp<RootTabParamList>) {
  navigation.navigate('MoreTab', { screen: 'MoreHome' });
  popMoreStackToMain(navigation);
}

export function popHeadlinersStackToMain(navigation: RootTabNavigation) {
  popTabStackToMain(navigation, 'HeadlinersTab');
}

export function openHeadlinersMain(navigation: NavigationProp<RootTabParamList>) {
  navigation.navigate('HeadlinersTab', { screen: 'HeadlinersMain' });
  popHeadlinersStackToMain(navigation);
}

export function openScheduleMainFromStack(
  navigation: Pick<NavigationProp<ScheduleStackParamList>, 'dispatch' | 'getState'>,
) {
  const state = navigation.getState();

  if ((state.index ?? 0) > 0) {
    navigation.dispatch(StackActions.popToTop());
  }
}

export function createNestedTabListeners(
  navigation: NavigationProp<RootTabParamList>,
  tabName: NestedTabName,
  onTabPress?: (event: { preventDefault: () => void }) => void,
) {
  return {
    blur: () => {
      popTabStackToMain(navigation, tabName);
    },
    tabPress: (event: { preventDefault: () => void }) => {
      if (onTabPress) {
        onTabPress(event);
        return;
      }

      if (tabName === 'ScheduleTab') {
        openScheduleTabMain(navigation);
        return;
      }

      if (tabName === 'Autographs') {
        openAutographsMain(navigation);
        return;
      }

      if (tabName === 'HeadlinersTab') {
        openHeadlinersMain(navigation);
        return;
      }

      openMoreHome(navigation);
    },
  };
}

export function createFlatTabListeners(navigation: NavigationProp<RootTabParamList>) {
  return {
    tabPress: () => {
      resetAllNestedTabStacks(navigation);
    },
  };
}
