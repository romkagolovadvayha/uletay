import { NavigationProp, StackActions } from '@react-navigation/native';
import { RootTabParamList, ScheduleStackParamList } from './types';

type NestedTabName = 'ScheduleTab' | 'Autographs' | 'MoreTab';

const NESTED_TABS: NestedTabName[] = ['ScheduleTab', 'Autographs', 'MoreTab'];

export function popTabStackToMain(
  navigation: NavigationProp<RootTabParamList>,
  tabName: NestedTabName,
) {
  const state = navigation.getState();
  const nestedState = state.routes.find((route) => route.name === tabName)?.state;

  if (!nestedState?.key || (nestedState.index ?? 0) === 0) {
    return;
  }

  navigation.dispatch({
    ...StackActions.popToTop(),
    target: nestedState.key,
  });
}

export function popScheduleStackToMain(navigation: NavigationProp<RootTabParamList>) {
  popTabStackToMain(navigation, 'ScheduleTab');
}

export function popAutographStackToMain(navigation: NavigationProp<RootTabParamList>) {
  popTabStackToMain(navigation, 'Autographs');
}

export function popMoreStackToMain(navigation: NavigationProp<RootTabParamList>) {
  popTabStackToMain(navigation, 'MoreTab');
}

export function resetAllNestedTabStacks(navigation: NavigationProp<RootTabParamList>) {
  for (const tabName of NESTED_TABS) {
    popTabStackToMain(navigation, tabName);
  }
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
