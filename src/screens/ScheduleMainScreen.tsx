import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScheduleDayView } from '../components/ScheduleDayView';
import { ScheduleStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ScheduleStackParamList, 'ScheduleMain'>;

export function ScheduleMainScreen({ navigation }: Props) {
  return <ScheduleDayView navigation={navigation} />;
}
