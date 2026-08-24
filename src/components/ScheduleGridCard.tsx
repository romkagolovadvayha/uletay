import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SchedulePerformance } from '../types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { formatSoonCountdown, formatTimeRange, parseDateTime, type PerformanceHighlight } from '../utils/scheduleHelpers';
import { CompetitionLabel } from './CompetitionLabel';
import { LiveBadge } from './LiveBadge';
import { FavoriteStar } from './ScheduleListItem';
import { SoonBadge } from './SoonBadge';
import { MotionPressable } from './MotionPressable';

type Props = {
  performance: SchedulePerformance;
  top: number;
  height: number;
  highlight: PerformanceHighlight;
  now: Date;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onPress?: () => void;
};

export function ScheduleGridCard({
  performance,
  top,
  height,
  highlight,
  now,
  isFavorite,
  onToggleFavorite,
  onPress,
}: Props) {
  const isLive = highlight === 'live';
  const isUpcoming = highlight === 'next';
  const isPast = highlight === 'past';
  const compact = height < 64;
  const soonCountdown = isUpcoming
    ? formatSoonCountdown(parseDateTime(performance.date, performance.startTime), now)
    : undefined;

  return (
    <MotionPressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.card,
        {
          top,
          height,
          opacity: isPast ? 0.42 : 1,
          justifyContent: 'center',
        },
        isLive && styles.cardLive,
        isUpcoming && styles.cardUpcoming,
      ]}
    >
      <View style={styles.cardBody}>
        <View style={styles.header}>
          <Text style={[styles.time, isLive && styles.timeLive]} numberOfLines={1}>
            {formatTimeRange(performance.startTime, performance.endTime)}
          </Text>
          {onToggleFavorite ? (
            <FavoriteStar isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} size={16} />
          ) : null}
        </View>

        <Text style={styles.artist} numberOfLines={compact ? 2 : 4}>
          {performance.artist}
        </Text>

        {!compact && performance.isCompetition ? <CompetitionLabel /> : null}

        {(isLive || isUpcoming) && !compact ? (
          <View style={styles.badgeRow}>
            {isLive ? <LiveBadge compact /> : <SoonBadge compact countdown={soonCountdown} />}
          </View>
        ) : null}
      </View>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardLive: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderColor: 'rgba(255, 59, 48, 0.35)',
  },
  cardUpcoming: {
    backgroundColor: 'rgba(255, 193, 7, 0.08)',
    borderColor: 'rgba(255, 193, 7, 0.28)',
  },
  cardBody: {
    gap: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  time: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
    textTransform: 'none',
    letterSpacing: 0,
  },
  timeLive: {
    color: colors.live,
  },
  artist: {
    ...typography.scheduleArtist,
    color: colors.text,
    fontSize: 12,
    lineHeight: 14,
  },
  badgeRow: {
    alignSelf: 'flex-start',
  },
});
