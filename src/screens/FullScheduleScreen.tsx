import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScheduleDayView } from '../components/ScheduleDayView';
import { ScheduleStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ScheduleStackParamList, 'FullSchedule'>;

export function FullScheduleScreen({ navigation }: Props) {
  return <ScheduleDayView navigation={navigation} />;
}
