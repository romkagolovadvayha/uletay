import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DateTabBar } from '../components/DateTabBar';
import { EventScheduleRow } from '../components/EventScheduleRow';
import { FavoriteNotificationsCard } from '../components/FavoriteNotificationsCard';
import { StageLegend } from '../components/StageLegend';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import { useNow } from '../hooks/useNow';
import { RootTabParamList } from '../navigation/types';
import { StageId } from '../types';
import { colors } from '../theme/colors';
import { screenHeaderStyle } from '../theme/layout';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { favoriteKey } from '../utils/favoriteKeys';
import {
  getDefaultFestivalDate,
  getFestivalDates,
  parseDateTime,
  sortByStartTime,
} from '../utils/scheduleHelpers';

type Props = {
  navigation: BottomTabNavigationProp<RootTabParamList, 'FavoritesTab'>;
};

type MyScheduleItem =
  | {
      kind: 'performance';
      id: string;
      date: string;
      startTime: string;
      stageId: StageId;
      artist: string;
      isCompetition?: boolean;
    }
  | {
      kind: 'autograph';
      id: string;
      date: string;
      startTime: string;
      stageId: StageId;
      artist: string;
    };

export function MyScheduleScreen({ navigation }: Props) {
  const { data } = useAppData();
  const now = useNow();
  const { favorites, isFavorite, toggleFavorite, isAutographFavorite, toggleAutographFavorite } = useFavorites();

  const festivalDates = useMemo(
    () => getFestivalDates(data.festival.startDate, data.festival.endDate),
    [data.festival.endDate, data.festival.startDate],
  );
  const [selectedDate, setSelectedDate] = useState(
    getDefaultFestivalDate(data.festival.startDate, data.festival.endDate, now),
  );

  const favoritePerformances = useMemo(
    () =>
      sortByStartTime(
        data.schedule.filter((item) => favorites.includes(favoriteKey('performance', item.id))),
      ),
    [data.schedule, favorites],
  );

  const favoriteAutographs = useMemo(
    () =>
      sortByStartTime(
        data.autographs.filter((item) => favorites.includes(favoriteKey('autograph', item.id))),
      ),
    [data.autographs, favorites],
  );

  const dayItems = useMemo(() => {
    const items: MyScheduleItem[] = [
      ...favoritePerformances
        .filter((item) => item.date === selectedDate)
        .map((item) => ({
          kind: 'performance' as const,
          id: item.id,
          date: item.date,
          startTime: item.startTime,
          stageId: item.stageId,
          artist: item.artist,
          isCompetition: item.isCompetition,
        })),
      ...favoriteAutographs
        .filter((item) => item.date === selectedDate)
        .map((item) => ({
          kind: 'autograph' as const,
          id: item.id,
          date: item.date,
          startTime: item.startTime,
          stageId: item.stageId,
          artist: item.artist,
        })),
    ];

    return items.sort(
      (a, b) => parseDateTime(a.date, a.startTime).getTime() - parseDateTime(b.date, b.startTime).getTime(),
    );
  }, [favoriteAutographs, favoritePerformances, selectedDate]);

  const hasAnyFavorites = favoritePerformances.length > 0 || favoriteAutographs.length > 0;

  const navigateToLive = (performanceId: string) => {
    navigation.navigate('ScheduleTab', {
      screen: 'LiveDetail',
      params: { performanceId },
    });
  };

  const navigateToAutograph = (sessionId: string) => {
    navigation.navigate('Autographs', {
      screen: 'AutographDetail',
      params: { sessionId },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>МОЁ РАСПИСАНИЕ</Text>
      </View>

      <View style={styles.tabsWrap}>
        <DateTabBar dates={festivalDates} selectedDate={selectedDate} onSelect={setSelectedDate} variant="red" />
      </View>

      <StageLegend />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FavoriteNotificationsCard />

        {!hasAnyFavorites ? (
          <View style={styles.empty}>
            <Ionicons name="star-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>ПОКА ПУСТО</Text>
            <Text style={styles.emptyText}>
              Нажми на звёздочку рядом с выступлением или автограф-сессией, чтобы добавить сюда
            </Text>
          </View>
        ) : dayItems.length > 0 ? (
          dayItems.map((item) => (
            <EventScheduleRow
              key={`${item.kind}:${item.id}`}
              time={item.startTime}
              stageId={item.stageId}
              artist={item.artist}
              subtitle={item.kind === 'performance' ? 'ВЫСТУПЛЕНИЕ' : 'АВТОГРАФ-СЕССИЯ'}
              subtitleTone={item.kind}
              isFavorite={
                item.kind === 'performance' ? isFavorite(item.id) : isAutographFavorite(item.id)
              }
              onToggleFavorite={() =>
                item.kind === 'performance' ? toggleFavorite(item.id) : toggleAutographFavorite(item.id)
              }
              onPress={() =>
                item.kind === 'performance' ? navigateToLive(item.id) : navigateToAutograph(item.id)
              }
              isCompetition={item.kind === 'performance' ? item.isCompetition : false}
            />
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Нет событий в этот день</Text>
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
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.sectionTitle,
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});
