import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DateTabBar } from './DateTabBar';
import { ScheduleStageGrid } from './ScheduleStageGrid';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import { useNow } from '../hooks/useNow';
import { ScheduleStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { screenHeaderStyle } from '../theme/layout';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import {
  filterByFestivalDay,
  getDefaultFestivalDate,
  getFestivalDates,
  sortByStartTime,
} from '../utils/scheduleHelpers';

type Props = {
  navigation: Pick<NativeStackNavigationProp<ScheduleStackParamList>, 'navigate'>;
  initialDate?: string;
};

export function ScheduleDayView({ navigation, initialDate }: Props) {
  const { data } = useAppData();
  const now = useNow(1000);
  const { isFavorite, toggleFavorite } = useFavorites();
  const festivalDates = useMemo(
    () => getFestivalDates(data.festival.startDate, data.festival.endDate),
    [data.festival.endDate, data.festival.startDate],
  );
  const [selectedDate, setSelectedDate] = useState(
    initialDate ?? getDefaultFestivalDate(data.festival.startDate, data.festival.endDate, now),
  );

  const dayPerformances = useMemo(
    () => sortByStartTime(filterByFestivalDay(data.schedule, selectedDate)),
    [data.schedule, selectedDate],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>РАСПИСАНИЕ</Text>
      </View>

      <View style={styles.tabsWrap}>
        <DateTabBar dates={festivalDates} selectedDate={selectedDate} onSelect={setSelectedDate} variant="red" />
      </View>

      <ScheduleStageGrid
        performances={dayPerformances}
        stages={data.stages}
        selectedDate={selectedDate}
        now={now}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
        onPressPerformance={(performanceId) => navigation.navigate('LiveDetail', { performanceId })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: screenHeaderStyle,
  title: {
    ...typography.screenTitle,
    color: colors.text,
  },
  tabsWrap: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.md,
  },
});
