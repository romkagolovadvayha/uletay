import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Headliner } from '../types';
import type { HeadlinerLastFmTrack } from '../types/lastfm';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';
import { resolveHeadlinerLastFm } from '../utils/headlinerGroups';
import { formatHeadlinerYears } from '../utils/headlinerHelpers';
import { formatLastFmCount, formatTrackDuration } from '../utils/lastfmFormat';
import { resolveTrackYandexArtist } from '../utils/yandexMusic';
import { HeadlinerThumbnail } from './HeadlinerCard';
import { SectionHeader } from './SectionHeader';
import { YandexMusicLink } from './YandexMusicLink';

export const HEADLINER_TOP_TRACKS_PREVIEW = 5;

type TeaserProps = {
  headliner: Headliner;
  allHeadliners: Headliner[];
  onPress: () => void;
};

export function HeadlinerTeaserCard({ headliner, allHeadliners, onPress }: TeaserProps) {
  const lastfm = resolveHeadlinerLastFm(headliner, allHeadliners);
  const yearsLabel = headliner.years.length
    ? `Улетай ${formatHeadlinerYears(headliner.years)}`
    : 'Хэдлайнер';
  const listeners = lastfm?.listeners;
  const playcount = lastfm?.playcount;
  const hasStats = Boolean(listeners || playcount);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Открыть карточку хэдлайнера ${headliner.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.teaserCard, pressed && styles.pressed]}
    >
      <HeadlinerThumbnail headliner={headliner} />
      <View style={styles.teaserMain}>
        <Text style={styles.teaserName} numberOfLines={1}>
          {headliner.name}
        </Text>
        <Text style={styles.teaserYears} numberOfLines={1}>
          {yearsLabel}
        </Text>
        <View style={styles.teaserMoreRow}>
          <Text style={styles.teaserMore}>Подробнее</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
        </View>
      </View>
      {hasStats ? (
        <View style={styles.teaserStats}>
          {listeners ? (
            <View style={styles.teaserStatBlock}>
              <Text style={styles.teaserStatValue}>{formatLastFmCount(listeners)}</Text>
              <Text style={styles.teaserStatLabel}>слушателей</Text>
            </View>
          ) : null}
          {playcount ? (
            <View style={styles.teaserStatBlock}>
              <Text style={styles.teaserStatValue}>{formatLastFmCount(playcount)}</Text>
              <Text style={styles.teaserStatLabel}>прослушиваний</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

type TracksProps = {
  headliner: Headliner;
  tracks: HeadlinerLastFmTrack[];
  onOpenHeadliner?: () => void;
};

export function HeadlinerTopTracksPreview({
  headliner,
  tracks,
  onOpenHeadliner,
}: TracksProps) {
  if (!tracks.length) {
    return null;
  }

  return (
    <View style={styles.tracksSection}>
      <SectionHeader title="ПОПУЛЯРНЫЕ ТРЕКИ" variant="muted" style={styles.tracksHeader} />
      {tracks.map((track, index) => {
        const duration = formatTrackDuration(track.durationSec);
        const rank = track.rank || index + 1;
        return (
          <View key={`${rank}-${track.name}`} style={styles.trackRow}>
            <Text style={styles.trackRank}>{rank}</Text>
            <View style={styles.trackMain}>
              <Text style={styles.trackName} numberOfLines={1}>
                {track.name}
              </Text>
              <Text style={styles.trackMeta} numberOfLines={1}>
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
      {onOpenHeadliner ? (
        <Text
          accessibilityRole="link"
          onPress={onOpenHeadliner}
          style={styles.headlinerLink}
        >
          Все треки и профиль {headliner.name}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  teaserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  teaserMain: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  teaserName: {
    ...appFont('semiBold'),
    color: colors.text,
    fontSize: 15,
  },
  teaserYears: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'none',
    letterSpacing: 0,
  },
  teaserMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  teaserMore: {
    ...appFont('semiBold'),
    color: colors.textSecondary,
    fontSize: 12,
  },
  teaserStats: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  teaserStatBlock: {
    alignItems: 'flex-end',
  },
  teaserStatValue: {
    ...appFont('bold'),
    color: colors.text,
    fontSize: 13,
    lineHeight: 16,
  },
  teaserStatLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 12,
    textTransform: 'none',
    letterSpacing: 0,
  },
  tracksSection: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  tracksHeader: {
    marginBottom: 0,
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
  headlinerLink: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.9,
  },
});
