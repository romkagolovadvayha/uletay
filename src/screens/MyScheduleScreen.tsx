import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AutographSessionRow } from '../components/AutographSessionRow';
import { CategoryPillBar } from '../components/CategoryPillBar';
import { DateTabBar } from '../components/DateTabBar';
import { FavoriteNotificationsCard } from '../components/FavoriteNotificationsCard';
import { ScheduleStageGrid } from '../components/ScheduleStageGrid';
import { useAppData } from '../context/DataContext';
import { useFavorites } from '../hooks/useFavorites';
import { useNow } from '../hooks/useNow';
import { RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { screenHeaderStyle } from '../theme/layout';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getAutographHighlight } from '../utils/autographHelpers';
import { favoriteKey } from '../utils/favoriteKeys';
import {
  formatSoonCountdown,
  getDefaultFestivalDate,
  getFestivalDates,
  parseDateTime,
  sortByStartTime,
} from '../utils/scheduleHelpers';

type Props = {
  navigation: BottomTabNavigationProp<RootTabParamList, 'FavoritesTab'>;
};

type FavoritesSection = 'schedule' | 'autographs';

const SECTION_TABS = [
  { id: 'schedule' as const, label: 'Расписание' },
  { id: 'autographs' as const, label: 'Автографы' },
];

export function MyScheduleScreen({ navigation }: Props) {
  const { data } = useAppData();
  const now = useNow(1000);
  const { favorites, isFavorite, toggleFavorite, isAutographFavorite, toggleAutographFavorite } = useFavorites();
  const [activeSection, setActiveSection] = useState<FavoritesSection>('schedule');

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

  const dayPerformances = useMemo(
    () => favoritePerformances.filter((item) => item.date === selectedDate),
    [favoritePerformances, selectedDate],
  );

  const dayAutographs = useMemo(
    () => favoriteAutographs.filter((item) => item.date === selectedDate),
    [favoriteAutographs, selectedDate],
  );

  const autographHighlights = useMemo(
    () =>
      dayAutographs.reduce<Record<string, ReturnType<typeof getAutographHighlight>>>((acc, session) => {
        acc[session.id] = getAutographHighlight(session, dayAutographs, now);
        return acc;
      }, {}),
    [dayAutographs, now],
  );

  const hasAnyFavorites = favoritePerformances.length > 0 || favoriteAutographs.length > 0;
  const hasSectionFavorites =
    activeSection === 'schedule' ? favoritePerformances.length > 0 : favoriteAutographs.length > 0;

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

      <View style={styles.sectionTabsWrap}>
        <CategoryPillBar
          categories={SECTION_TABS}
          selectedId={activeSection}
          onSelect={(id) => setActiveSection(id as FavoritesSection)}
        />
      </View>

      <View style={styles.tabsWrap}>
        <DateTabBar dates={festivalDates} selectedDate={selectedDate} onSelect={setSelectedDate} variant="red" />
      </View>

      <View style={styles.notificationsWrap}>
        <FavoriteNotificationsCard />
      </View>

      {!hasAnyFavorites ? (
        <View style={styles.empty}>
          <Ionicons name="star-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>ПОКА ПУСТО</Text>
          <Text style={styles.emptyText}>
            Нажми на звёздочку рядом с выступлением или автограф-сессией, чтобы добавить сюда
          </Text>
        </View>
      ) : !hasSectionFavorites ? (
        <View style={styles.empty}>
          <Ionicons name="star-outline" size={28} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>
            {activeSection === 'schedule' ? 'НЕТ ВЫСТУПЛЕНИЙ' : 'НЕТ АВТОГРАФ-СЕССИЙ'}
          </Text>
          <Text style={styles.emptyText}>
            {activeSection === 'schedule'
              ? 'Добавь выступления из расписания в избранное'
              : 'Добавь автограф-сессии в избранное'}
          </Text>
        </View>
      ) : activeSection === 'schedule' ? (
        dayPerformances.length > 0 ? (
          <ScheduleStageGrid
            performances={dayPerformances}
            stages={data.stages}
            selectedDate={selectedDate}
            now={now}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
            onPressPerformance={navigateToLive}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Нет избранных выступлений в этот день</Text>
          </View>
        )
      ) : dayAutographs.length > 0 ? (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {dayAutographs.map((session) => {
            const highlight = autographHighlights[session.id];
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
                onPress={() => navigateToAutograph(session.id)}
              />
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Нет избранных автограф-сессий в этот день</Text>
        </View>
      )}
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
  sectionTabsWrap: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xs,
  },
  tabsWrap: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xs,
  },
  notificationsWrap: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxl,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxxl,
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
