import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeadlinerCard } from '../components/HeadlinerCard';
import { MotionPressable } from '../components/MotionPressable';
import { ScreenTitle } from '../components/ScreenTitle';
import { YandexMusicLink } from '../components/YandexMusicLink';
import { useAppData } from '../context/DataContext';
import { HeadlinersStackParamList, MoreStackParamList } from '../navigation/types';
import type { Headliner } from '../types';
import type { HeadlinerLastFmTrack } from '../types/lastfm';
import { resolveTrackYandexArtist } from '../utils/yandexMusic';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';
import { formatLastFmCount, formatTrackDuration } from '../utils/lastfmFormat';
import { getLastFmTopTracksMoreCount } from '../utils/lastfmTracks';
import { formatHeadlinerYears, resolveSimilarHeadliners } from '../utils/headlinerHelpers';
import { getHeadlinerDisplayAlternateNames } from '../utils/headlinerGroups';

type Props = NativeStackScreenProps<
  HeadlinersStackParamList | MoreStackParamList,
  'HeadlinerDetail'
>;

type HeadlinerTopTracksSectionProps = {
  headliner: Headliner;
  topTracks: HeadlinerLastFmTrack[];
  moreTracksCount: number;
};

function HeadlinerTopTracksSection({
  headliner,
  topTracks,
  moreTracksCount,
}: HeadlinerTopTracksSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Популярные треки</Text>
      {topTracks.map((track) => {
        const duration = formatTrackDuration(track.durationSec);
        return (
          <View key={`${track.rank}-${track.name}`} style={styles.trackRow}>
            <Text style={styles.trackRank}>{track.rank}</Text>
            <View style={styles.trackMain}>
              <Text style={styles.trackName}>{track.name}</Text>
              <Text style={styles.trackMeta}>
                {formatLastFmCount(track.playcount)} прослушиваний
                {duration ? ` · ${duration}` : ''}
              </Text>
            </View>
            <View style={styles.trackAction}>
              <YandexMusicLink
                artist={resolveTrackYandexArtist(headliner, track)}
                track={track.name}
                variant="icon"
              />
            </View>
          </View>
        );
      })}
      {moreTracksCount > 0 ? (
        <Text style={styles.tracksMoreLabel}>и ещё {formatLastFmCount(moreTracksCount)}</Text>
      ) : null}
    </View>
  );
}

export function HeadlinerDetailScreen({ navigation, route }: Props) {
  const { data } = useAppData();
  const headliner = data.headliners.find((item) => item.id === route.params.headlinerId);
  const lastfm = headliner?.lastfm;
  const similarHeadliners = useMemo(
    () =>
      headliner && lastfm?.similarArtists.length
        ? resolveSimilarHeadliners(data.headliners, headliner.id, lastfm.similarArtists)
        : [],
    [data.headliners, headliner, lastfm],
  );
  const topTracks = lastfm?.topTracks ?? [];
  const moreTracksCount = useMemo(
    () => (lastfm ? getLastFmTopTracksMoreCount(lastfm) : 0),
    [lastfm],
  );
  const alternateNames = useMemo(
    () => (headliner ? getHeadlinerDisplayAlternateNames(headliner) : []),
    [headliner],
  );

  if (!headliner) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.emptyWrap}>
          <ScreenTitle style={styles.emptyText}>Хэдлайнер не найден</ScreenTitle>
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel="Назад"
            onPress={() => navigation.goBack()}
            style={styles.emptyBackButton}
          >
            <Text style={styles.backLink}>Назад</Text>
          </MotionPressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MotionPressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.backRow}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
          <Text style={styles.backLabel}>Назад</Text>
        </MotionPressable>

        <HeadlinerCard headliner={headliner} large />
        <ScreenTitle style={styles.name}>{headliner.name.toUpperCase()}</ScreenTitle>
        {alternateNames.length ? (
          <Text style={styles.alternateNames}>{alternateNames.join(' · ')}</Text>
        ) : null}
        <Text style={styles.year}>
          {headliner.years.length
            ? `УЛЕТАЙ ${formatHeadlinerYears(headliner.years)}`
            : 'УЛЕТАЙ'}
        </Text>

        <YandexMusicLink artist={headliner.name} variant="listen" />

        {lastfm ? (
          <View style={styles.metaSection}>
            {lastfm.tags.length > 0 ? (
              <View style={styles.tagRow}>
                {lastfm.tags.slice(0, 6).map((tag) => (
                  <View key={tag.name} style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag.name}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatLastFmCount(lastfm.listeners)}</Text>
                <Text style={styles.statLabel}>слушателей</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatLastFmCount(lastfm.playcount)}</Text>
                <Text style={styles.statLabel}>прослушиваний</Text>
              </View>
            </View>
          </View>
        ) : null}

        {topTracks.length ? (
          <HeadlinerTopTracksSection
            key={route.params.headlinerId}
            headliner={headliner}
            topTracks={topTracks}
            moreTracksCount={moreTracksCount}
          />
        ) : null}

        {similarHeadliners.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Похожие артисты</Text>
            <View style={styles.similarRow}>
              {similarHeadliners.map((artist) => (
                <MotionPressable
                  key={artist.id}
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('HeadlinerDetail', { headlinerId: artist.id })}
                  style={styles.similarPill}
                >
                  <Text style={styles.similarText}>{artist.name}</Text>
                </MotionPressable>
              ))}
            </View>
          </View>
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
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxl,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.headerTop,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
    minHeight: 48,
  },
  backLabel: {
    ...appFont('semiBold'),
    color: colors.textSecondary,
    fontSize: 15,
  },
  name: {
    ...typography.heroArtist,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  alternateNames: {
    ...typography.body,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: spacing.sm,
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  year: {
    ...typography.caption,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    textTransform: 'none',
    letterSpacing: 0.8,
  },
  metaSection: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  tagPill: {
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tagText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 12,
    textTransform: 'lowercase',
    letterSpacing: 0.2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  statValue: {
    ...appFont('semiBold'),
    color: colors.text,
    fontSize: 18,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  section: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.artistName,
    color: colors.text,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  trackRank: {
    ...appFont('semiBold'),
    color: colors.primary,
    width: 20,
    textAlign: 'center',
    fontSize: 14,
  },
  trackMain: {
    flex: 1,
    minWidth: 0,
  },
  trackAction: {
    alignSelf: 'center',
    justifyContent: 'center',
  },
  trackName: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
  },
  trackMeta: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    textTransform: 'none',
    letterSpacing: 0,
  },
  tracksMoreLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  similarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  similarPill: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 48,
    justifyContent: 'center',
  },
  similarText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.screen,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyBackButton: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLink: {
    ...appFont('semiBold'),
    color: colors.primary,
    fontSize: 15,
  },
});
