import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StackActions } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { ScheduleLiveScreen } from '../components/ScheduleLiveView';
import { useCurrentLivePerformance } from '../hooks/useCurrentLivePerformance';
import { RootTabParamList, ScheduleStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ScheduleStackParamList, 'LiveDetail'>;

export function LiveDetailScreen({ navigation, route }: Props) {
  const primary = useCurrentLivePerformance(route.params.performanceId);

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      requestAnimationFrame(() => {
        const tabNavigation = navigation.getParent()?.getParent();
        if (!tabNavigation) {
          return;
        }

        const tabState = tabNavigation.getState();
        const activeTab = tabState.routes[tabState.index]?.name as keyof RootTabParamList | undefined;
        if (activeTab === 'ScheduleTab') {
          return;
        }

        const stackNavigation = navigation.getParent();
        const stackState = stackNavigation?.getState();
        if (stackNavigation && stackState && (stackState.index ?? 0) > 0) {
          stackNavigation.dispatch(StackActions.popToTop());
        }
      });
    });

    return unsubscribe;
  }, [navigation]);

  return <ScheduleLiveScreen primary={primary} navigation={navigation} />;
}
