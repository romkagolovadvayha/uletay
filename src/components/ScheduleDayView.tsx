import { webLabel } from '../theme/ios';
import React, { useMemo } from 'react';
import { Platform,StyleSheet, Text, View } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DateTabBar } from './DateTabBar';
import { ScheduleStageGrid } from './ScheduleStageGrid';
import { ScreenTitle } from './ScreenTitle';
import { PrimaryButton } from './PrimaryButton';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import { useFestivalSelectedDate } from '../hooks/useFestivalSelectedDate';
import { useNow } from '../hooks/useNow';
import { RootTabParamList, ScheduleStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { screenHeaderStyle } from '../theme/layout';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getFestivalDayDate } from '../utils/festivalTime';
import {
  filterByFestivalDay,
  getFestivalDates,
  sortByStartTime,
} from '../utils/scheduleHelpers';

type Props = {
  navigation: Pick<NativeStackNavigationProp<ScheduleStackParamList>, 'navigate' | 'getParent'>;
  initialDate?: string;
};

export function ScheduleDayView({ navigation, initialDate }: Props) {
  const { data } = useAppData();
  const now = useNow(15000);
  const { isFavorite, toggleFavorite } = useFavorites();
  const festivalDates = useMemo(
    () => getFestivalDates(data.festival.startDate, data.festival.endDate),
    [data.festival.endDate, data.festival.startDate],
  );
  const [selectedDate, setSelectedDate] = useFestivalSelectedDate(
    data.festival.startDate,
    data.festival.endDate,
    now,
    initialDate,
  );

  const dayPerformances = useMemo(
    () => sortByStartTime(filterByFestivalDay(data.schedule, selectedDate)),
    [data.schedule, selectedDate],
  );
  const hasPublishedSchedule = data.schedule.some((item) =>
    festivalDates.includes(getFestivalDayDate(item.date, item.startTime)),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <ScreenTitle style={styles.title}>{webLabel('Расписание')}</ScreenTitle>
      </View>

      <View style={styles.tabsWrap}>
        <DateTabBar dates={festivalDates} selectedDate={selectedDate} onSelect={setSelectedDate} variant="red" />
      </View>

      <ScheduleStageGrid
        bottomInset={Platform.OS==='web'?0:80}
        performances={dayPerformances}
        centerStageHeaders={!hasPublishedSchedule}
        emptyMessage={hasPublishedSchedule
          ? 'Нет выступлений в этот день'
          : `Расписание Улетай ${data.festival.year} ещё не опубликовано. Следите за обновлениями.`}
        emptyContent={(
          <View style={styles.emptyContent}>
            <Text style={styles.emptyTitle}>
              {hasPublishedSchedule ? 'Нет выступлений в этот день' : `Расписание ${data.festival.year} скоро`}
            </Text>
            {!hasPublishedSchedule ? <>
              <PrimaryButton label="Хедлайнеры" style={styles.headlinersButton} onPress={() => {
                navigation.getParent<NavigationProp<RootTabParamList>>()?.navigate('HeadlinersTab', {
                  screen: 'HeadlinersMain', params: { year: String(data.festival.year) },
                });
              }} />
            </> : null}
          </View>
        )}
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
    backgroundColor: colors.pageBackground,
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
  emptyContent: { width: '100%', maxWidth: 420, alignItems: 'center', gap: spacing.lg },
  emptyTitle: { ...typography.sectionTitle, color: colors.text, textAlign: 'center' },
  emptyDescription: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  headlinersButton: { width: '100%', maxWidth: 320 },
});
