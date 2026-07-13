import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeadlinerCard } from '../components/HeadlinerCard';
import { YandexMusicLink } from '../components/YandexMusicLink';
import { useAppData } from '../context/DataContext';
import { HeadlinersStackParamList, MoreStackParamList } from '../navigation/types';
import type { HeadlinerLastFmTrack } from '../types/lastfm';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';
import { formatLastFmCount, formatTrackDuration, sortTracksByPopularity } from '../utils/lastfmFormat';
import { resolveSimilarHeadliners } from '../utils/headlinerHelpers';

type Props = NativeStackScreenProps<
  HeadlinersStackParamList | MoreStackParamList,
  'HeadlinerDetail'
>;

const TRACKS_PREVIEW_COUNT = 10;

type HeadlinerTopTracksSectionProps = {
  artistName: string;
  topTracks: HeadlinerLastFmTrack[];
};

function HeadlinerTopTracksSection({ artistName, topTracks }: HeadlinerTopTracksSectionProps) {
  const [tracksExpanded, setTracksExpanded] = useState(false);
  const visibleTracks = tracksExpanded
    ? topTracks
    : topTracks.slice(0, TRACKS_PREVIEW_COUNT);
  const hasMoreTracks = topTracks.length > TRACKS_PREVIEW_COUNT;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Популярные треки</Text>
      {visibleTracks.map((track) => {
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
            <YandexMusicLink artist={artistName} track={track.name} variant="icon" />
          </View>
        );
      })}
      {hasMoreTracks ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setTracksExpanded((value) => !value)}
          style={({ pressed }) => [styles.tracksMoreButton, pressed && styles.pressed]}
        >
          <Text style={styles.tracksMoreLabel}>
            {tracksExpanded ? 'Свернуть' : `ЕЩЁ ${topTracks.length - TRACKS_PREVIEW_COUNT}`}
          </Text>
        </Pressable>
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
  const topTracks = useMemo(
    () => (lastfm?.topTracks.length ? sortTracksByPopularity(lastfm.topTracks) : []),
    [lastfm],
  );

  if (!headliner) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Хэдлайнер не найден</Text>
          <Pressable accessibilityRole="button" onPress={() => navigation.goBack()}>
            <Text style={styles.backLink}>Назад</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
          <Text style={styles.backLabel}>Назад</Text>
        </Pressable>

        <HeadlinerCard headliner={headliner} large />
        <Text style={styles.name}>{headliner.name.toUpperCase()}</Text>
        <Text style={styles.year}>
          {headliner.years.length
            ? headliner.years.map((year) => `УЛЕТАЙ ${year}`).join(' · ')
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

            {lastfm.onTour ? <Text style={styles.tourBadge}>В туре</Text> : null}
          </View>
        ) : null}

        {topTracks.length ? (
          <HeadlinerTopTracksSection
            key={route.params.headlinerId}
            artistName={headliner.name}
            topTracks={topTracks}
          />
        ) : null}

        {similarHeadliners.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Похожие артисты</Text>
            <View style={styles.similarRow}>
              {similarHeadliners.map((artist) => (
                <Pressable
                  key={artist.id}
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('HeadlinerDetail', { headlinerId: artist.id })}
                  style={({ pressed }) => [styles.similarPill, pressed && styles.pressed]}
                >
                  <Text style={styles.similarText}>{artist.name}</Text>
                </Pressable>
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
    fontSize: 11,
    marginTop: 2,
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  tourBadge: {
    ...typography.caption,
    color: colors.primary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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
  trackName: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
  },
  trackMeta: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    textTransform: 'none',
    letterSpacing: 0,
  },
  tracksMoreButton: {
    alignSelf: 'center',
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tracksMoreLabel: {
    ...appFont('semiBold'),
    color: colors.primary,
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
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
  backLink: {
    ...appFont('semiBold'),
    color: colors.primary,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.9,
  },
});
