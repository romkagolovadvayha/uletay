import { NavigationProp, StackActions } from '@react-navigation/native';
import { RootTabParamList, ScheduleStackParamList } from './types';

export function popScheduleStackToMain(navigation: NavigationProp<RootTabParamList>) {
  const state = navigation.getState();
  const scheduleState = state.routes.find((route) => route.name === 'ScheduleTab')?.state;

  if (!scheduleState?.key || (scheduleState.index ?? 0) === 0) {
    return;
  }

  navigation.dispatch({
    ...StackActions.popToTop(),
    target: scheduleState.key,
  });
}

export function openScheduleTabMain(navigation: NavigationProp<RootTabParamList>) {
  navigation.navigate('ScheduleTab', { screen: 'ScheduleMain' });
  popScheduleStackToMain(navigation);
}

export function openScheduleMainFromStack(
  navigation: Pick<NavigationProp<ScheduleStackParamList>, 'dispatch' | 'getState'>,
) {
  const state = navigation.getState();

  if ((state.index ?? 0) > 0) {
    navigation.dispatch(StackActions.popToTop());
  }
}
