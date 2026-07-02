import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StageId } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { LiveBadge } from './LiveBadge';
import { CompetitionLabel } from './CompetitionLabel';
import { SoonBadge } from './SoonBadge';
import { FavoriteStar } from './ScheduleListItem';
import { StageDot } from './StageDot';

type SubtitleTone = 'performance' | 'autograph';

type Props = {
  time: string;
  stageId: StageId;
  artist: string;
  subtitle?: string;
  subtitleTone?: SubtitleTone;
  isLive?: boolean;
  isUpcoming?: boolean;
  soonCountdown?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onPress?: () => void;
  trailing?: ReactNode;
  isCompetition?: boolean;
};

export function EventScheduleRow({
  time,
  stageId,
  artist,
  subtitle,
  subtitleTone,
  isLive,
  isUpcoming,
  soonCountdown,
  isFavorite,
  onToggleFavorite,
  onPress,
  trailing,
  isCompetition,
}: Props) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={[styles.time, isLive && styles.timeLive]}>{time}</Text>
      <StageDot stageId={stageId} size={7} />
      <View style={styles.main}>
        <Text style={styles.artist} numberOfLines={2}>
          {artist}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              subtitleTone === 'performance' && styles.subtitlePerformance,
              subtitleTone === 'autograph' && styles.subtitleAutograph,
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
        {isCompetition ? <CompetitionLabel /> : null}
      </View>
      <View style={styles.actions}>
        {isLive ? <LiveBadge compact /> : isUpcoming ? <SoonBadge compact countdown={soonCountdown} /> : null}
        {onToggleFavorite ? (
          <FavoriteStar isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} size={22} />
        ) : null}
        {trailing}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {
    opacity: 0.92,
  },
  time: {
    width: 84,
    ...typography.scheduleTime,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 16,
  },
  timeLive: {
    color: colors.live,
  },
  main: {
    flex: 1,
    gap: 2,
  },
  artist: {
    ...typography.scheduleArtist,
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  subtitlePerformance: {
    color: colors.schedulePerformanceLabel,
  },
  subtitleAutograph: {
    color: colors.scheduleAutographLabel,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
