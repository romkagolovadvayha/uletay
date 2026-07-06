import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AutographSessionRow } from '../components/AutographSessionRow';
import { ScreenTitle } from '../components/ScreenTitle';
import { DateTabBar } from '../components/DateTabBar';
import { StageLegend } from '../components/StageLegend';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import { useNow } from '../hooks/useNow';
import { AutographStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { screenHeaderStyle } from '../theme/layout';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getAutographHighlight, type AutographHighlight } from '../utils/autographHelpers';
import {
  filterByFestivalDay,
  formatSoonCountdown,
  getDefaultFestivalDate,
  getFestivalDates,
  parseDateTime,
  sortByStartTime,
} from '../utils/scheduleHelpers';

type Props = NativeStackScreenProps<AutographStackParamList, 'AutographsMain'>;

export function AutographsScreen({ navigation }: Props) {
  const { data } = useAppData();
  const now = useNow(1000);
  const { isAutographFavorite, toggleAutographFavorite } = useFavorites();
  const festivalDates = useMemo(
    () => getFestivalDates(data.festival.startDate, data.festival.endDate),
    [data.festival.endDate, data.festival.startDate],
  );
  const [selectedDate, setSelectedDate] = useState(
    getDefaultFestivalDate(data.festival.startDate, data.festival.endDate, now),
  );

  const daySessions = useMemo(
    () => sortByStartTime(filterByFestivalDay(data.autographs, selectedDate)),
    [data.autographs, selectedDate],
  );

  const sessionHighlights = useMemo(
    () =>
      daySessions.reduce<Record<string, AutographHighlight>>((acc, session) => {
        acc[session.id] = getAutographHighlight(session, daySessions, now);
        return acc;
      }, {}),
    [daySessions, now],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <ScreenTitle style={styles.title}>АВТОГРАФ-СЕССИИ</ScreenTitle>
      </View>

      <View style={styles.tabsWrap}>
        <DateTabBar dates={festivalDates} selectedDate={selectedDate} onSelect={setSelectedDate} variant="red" />
      </View>

      <StageLegend />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {daySessions.length > 0 ? (
          daySessions.map((session) => {
            const highlight = sessionHighlights[session.id];
            const isUpcoming = highlight === 'next';

            return (
              <AutographSessionRow
                key={session.id}
                session={session}
                isLive={highlight === 'live'}
                isUpcoming={isUpcoming}
                soonCountdown={
                  isUpcoming
                    ? formatSoonCountdown(parseDateTime(session.date, session.startTime), now)
                    : undefined
                }
                isFavorite={isAutographFavorite(session.id)}
                onToggleFavorite={() => toggleAutographFavorite(session.id)}
                onPress={() => navigation.navigate('AutographDetail', { sessionId: session.id })}
              />
            );
          })
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Нет автограф-сессий в этот день</Text>
          </View>
        )}
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
    fontSize: 22,
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
