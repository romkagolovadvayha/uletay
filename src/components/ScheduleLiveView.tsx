import { NavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiveHeroCard } from './LiveArtistCard';
import {
  HEADLINER_TOP_TRACKS_PREVIEW,
  HeadlinerTeaserCard,
  HeadlinerTopTracksPreview,
} from './HeadlinerTeaserCard';
import { NextUpItem } from './ScheduleListItem';
import { PrimaryButton } from './PrimaryButton';
import { SectionHeader } from './SectionHeader';
import { useAppData } from '../context/DataContext';
import { useNow } from '../hooks/useNow';
import { RootTabParamList, ScheduleStackParamList } from '../navigation/types';
import { openHeadlinerDetail, openScheduleMainFromStack } from '../navigation/scheduleNavigation';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getHeadlinerById } from '../utils/headlinersCore';
import { resolveHeadlinerLastFm } from '../utils/headlinerGroups';
import { PrimaryPerformance, getStageName, getUpcomingOnSameStage, isStartingSoon } from '../utils/scheduleHelpers';
import { useFavorites } from '../hooks/useFavorites';

type Props = {
  primary: PrimaryPerformance | null;
  navigation: Pick<
    NativeStackNavigationProp<ScheduleStackParamList>,
    'dispatch' | 'getState' | 'navigate' | 'replace' | 'getParent'
  >;
};

export function ScheduleLiveView({ primary, navigation }: Props) {
  const { data } = useAppData();
  const now = useNow();
  const { isFavorite, toggleFavorite } = useFavorites();

  const performance = primary?.performance;
  const status = primary?.status ?? 'upcoming';
  const isSoon =
    performance != null &&
    status === 'upcoming' &&
    isStartingSoon(performance.date, performance.startTime, now);

  const headliner = useMemo(
    () => (performance ? getHeadlinerById(data.headliners, performance.headlinerId) : undefined),
    [data.headliners, performance],
  );

  const lastfm = useMemo(
    () => (headliner ? resolveHeadlinerLastFm(headliner, data.headliners) : undefined),
    [data.headliners, headliner],
  );

  const topTracks = useMemo(
    () => (lastfm?.topTracks ?? []).slice(0, HEADLINER_TOP_TRACKS_PREVIEW),
    [lastfm],
  );

  const upcoming = useMemo(
    () => (performance ? getUpcomingOnSameStage(performance, data.schedule) : []),
    [data.schedule, performance],
  );

  if (!performance) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyTitle}>Расписание завершено</Text>
        <Text style={styles.emptyText}>Нет предстоящих выступлений в программе</Text>
        <PrimaryButton label="СМОТРЕТЬ РАСПИСАНИЕ" onPress={() => openScheduleMainFromStack(navigation)} />
      </View>
    );
  }

  const headerTitle =
    status === 'live'
      ? 'СЕЙЧАС ВЫСТУПАЕТ'
      : status === 'past'
        ? 'ВЫСТУПЛЕНИЕ'
        : isSoon
          ? 'СКОРО ВЫСТУПИТ'
          : 'СЛЕДУЮЩЕЕ ВЫСТУПЛЕНИЕ';
  const performanceIsFavorite = isFavorite(performance.id);

  const openHeadliner = () => {
    if (!headliner) {
      return;
    }
    const rootNavigation = navigation.getParent() as NavigationProp<RootTabParamList> | undefined;
    if (!rootNavigation) {
      return;
    }
    openHeadlinerDetail(rootNavigation, headliner.id);
  };

  return (
    <>
      <SectionHeader title={headerTitle} style={styles.header} />
      <LiveHeroCard
        performance={performance}
        stageName={getStageName(performance.stageId, data.stages)}
        status={status}
        now={now}
      />

      <View style={styles.buttonWrap}>
        {headliner ? (
          <HeadlinerTeaserCard
            headliner={headliner}
            allHeadliners={data.headliners}
            onPress={openHeadliner}
          />
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => toggleFavorite(performance.id)}
          style={({ pressed }) => [styles.favoriteButton, pressed && styles.pressed]}
        >
          <Text style={styles.favoriteButtonText}>
            {performanceIsFavorite ? 'В ИЗБРАННОМ' : 'ДОБАВИТЬ В ИЗБРАННОЕ'}
          </Text>
        </Pressable>
        <PrimaryButton
          label="СМОТРЕТЬ РАСПИСАНИЕ"
          onPress={() => openScheduleMainFromStack(navigation)}
        />
      </View>

      {headliner && topTracks.length ? (
        <HeadlinerTopTracksPreview
          headliner={headliner}
          lastfm={lastfm}
          tracks={topTracks}
          onOpenHeadliner={openHeadliner}
        />
      ) : null}

      <SectionHeader title="ДАЛЕЕ НА ЭТОЙ СЦЕНЕ" variant="muted" style={styles.nextHeader} />
      {upcoming.length > 0 ? (
        upcoming.map((item) => (
          <NextUpItem
            key={item.id}
            performance={item}
            isFavorite={isFavorite(item.id)}
            onToggleFavorite={() => toggleFavorite(item.id)}
            onPress={() => navigation.replace('LiveDetail', { performanceId: item.id })}
          />
        ))
      ) : (
        <Text style={styles.noMore}>Больше выступлений на этой сцене сегодня нет</Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {},
  buttonWrap: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  favoriteButton: {
    borderWidth: 1,
    borderColor: colors.text,
    borderRadius: radius.md,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  favoriteButtonText: {
    ...typography.button,
    color: colors.text,
    fontSize: 13,
    letterSpacing: 0.4,
  },
  pressed: {
    opacity: 0.9,
  },
  nextHeader: {},
  noMore: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
  },
  emptyWrap: {
    paddingTop: spacing.xxxl,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.sectionTitle,
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});

export function ScheduleLiveScreen({ primary, navigation }: Props) {
  return (
    <SafeAreaView style={screenStyles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={screenStyles.content} showsVerticalScrollIndicator={false}>
        <ScheduleLiveView primary={primary} navigation={navigation} />
      </ScrollView>
    </SafeAreaView>
  );
}

const screenStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxl,
  },
});
