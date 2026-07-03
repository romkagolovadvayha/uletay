import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScheduleLiveScreen } from '../components/ScheduleLiveView';
import { useCurrentLivePerformance } from '../hooks/useCurrentLivePerformance';
import { ScheduleStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ScheduleStackParamList, 'LiveDetail'>;

export function LiveDetailScreen({ navigation, route }: Props) {
  const primary = useCurrentLivePerformance(route.params.performanceId);

  return <ScheduleLiveScreen primary={primary} navigation={navigation} />;
}
