import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CurrentTimeLine } from './CurrentTimeLine';
import { DateTabBar } from './DateTabBar';
import { EventScheduleRow } from './EventScheduleRow';
import { StageLegend } from './StageLegend';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import { useNow } from '../hooks/useNow';
import { ScheduleStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { screenHeaderStyle } from '../theme/layout';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import {
  formatFestivalClock,
  formatSoonCountdown,
  getCurrentTimeMinutes,
  getDefaultFestivalDate,
  getFestivalDates,
  getPerformanceHighlight,
  getPerformanceStartMinutes,
  isSameFestivalDay,
  parseDateTime,
  sortByStartTime,
  type PerformanceHighlight,
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
    () => sortByStartTime(data.schedule.filter((item) => item.date === selectedDate)),
    [data.schedule, selectedDate],
  );

  const performanceHighlights = useMemo(
    () =>
      dayPerformances.reduce<Record<string, PerformanceHighlight>>((acc, performance) => {
        acc[performance.id] = getPerformanceHighlight(performance, dayPerformances, now);
        return acc;
      }, {}),
    [dayPerformances, now],
  );

  const showNowLine = isSameFestivalDay(selectedDate, now);
  const currentMinutes = getCurrentTimeMinutes(now);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>РАСПИСАНИЕ</Text>
      </View>

      <View style={styles.tabsWrap}>
        <DateTabBar dates={festivalDates} selectedDate={selectedDate} onSelect={setSelectedDate} variant="red" />
      </View>

      <StageLegend />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {dayPerformances.length > 0 ? (
          dayPerformances.map((performance, index) => {
            const highlight = performanceHighlights[performance.id];
            const isUpcoming = highlight === 'next';
            const startMinutes = getPerformanceStartMinutes(performance);
            const prevStartMinutes =
              index > 0 ? getPerformanceStartMinutes(dayPerformances[index - 1]) : -1;
            const shouldShowNowLine =
              showNowLine && currentMinutes >= prevStartMinutes && currentMinutes < startMinutes;
            const nowTimeLabel = formatFestivalClock(now);

            return (
              <React.Fragment key={performance.id}>
                {shouldShowNowLine ? <CurrentTimeLine time={nowTimeLabel} /> : null}
                <EventScheduleRow
                  time={performance.startTime}
                  stageId={performance.stageId}
                  artist={performance.artist}
                  isLive={highlight === 'live'}
                  isUpcoming={isUpcoming}
                  soonCountdown={
                    isUpcoming
                      ? formatSoonCountdown(parseDateTime(performance.date, performance.startTime), now)
                      : undefined
                  }
                  isFavorite={isFavorite(performance.id)}
                  onToggleFavorite={() => toggleFavorite(performance.id)}
                  onPress={() => navigation.navigate('LiveDetail', { performanceId: performance.id })}
                />
              </React.Fragment>
            );
          })
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Нет выступлений в этот день</Text>
          </View>
        )}
        {showNowLine &&
        dayPerformances.length > 0 &&
        currentMinutes >= getPerformanceStartMinutes(dayPerformances[dayPerformances.length - 1]) ? (
          <CurrentTimeLine time={formatFestivalClock(now)} />
        ) : null}
      </ScrollView>
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
    paddingBottom: spacing.xl / 2,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxl,
  },
  empty: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
  },
});
