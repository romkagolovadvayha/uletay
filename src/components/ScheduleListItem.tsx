import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { SchedulePerformance } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { formatDayMonthLabel, formatStartsIn, formatTimeRange, parseDateTime } from '../utils/scheduleHelpers';
import { CompetitionLabel } from './CompetitionLabel';
import { LiveBadge } from './LiveBadge';
import { PerformanceMetaDivider, PerformanceTimeDateRow, performanceTimeWeightStyle } from './PerformanceTimeDateRow';
import { SoonBadge } from './SoonBadge';
import { StageDot } from './StageDot';

type Props = {
  performance: SchedulePerformance;
  stageName?: string;
  isLive?: boolean;
  isUpcoming?: boolean;
  now?: Date;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onPress?: () => void;
  timeline?: boolean;
};

export function FavoriteStar({
  isFavorite,
  onToggleFavorite,
  size = 20,
}: {
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  size?: number;
}) {
  if (!onToggleFavorite) {
    return null;
  }

  const handlePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onToggleFavorite();
  };

  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
      onPress={handlePress}
      hitSlop={10}
    >
      <Ionicons
        name={isFavorite ? 'star' : 'star-outline'}
        size={size}
        color={colors.star}
      />
    </Pressable>
  );
}

export function ScheduleTimelineItem({
  performance,
  isLive,
  onPress,
}: {
  performance: SchedulePerformance;
  isLive?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.timelineRow, isLive && styles.timelineLive]}
    >
      <Text style={[styles.timelineTime, isLive && styles.timelineTimeLive]}>{performance.startTime}</Text>
      <View style={styles.timelineMain}>
        <StageDot stageId={performance.stageId} size={7} />
        <View style={styles.timelineText}>
          <Text style={styles.timelineArtist} numberOfLines={2}>
            {performance.artist}
          </Text>
          {performance.isCompetition ? <CompetitionLabel /> : null}
        </View>
      </View>
    </Pressable>
  );
}

export function ScheduleListItem({
  performance,
  stageName,
  isLive,
  isUpcoming,
  now = new Date(),
  isFavorite,
  onToggleFavorite,
  onPress,
  timeline,
}: Props) {
  if (timeline) {
    return (
      <ScheduleTimelineItem performance={performance} isLive={isLive} onPress={onPress} />
    );
  }

  const startsIn = isUpcoming ? formatStartsIn(parseDateTime(performance.date, performance.startTime), now) : null;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={[styles.row, isLive && styles.liveRow, isUpcoming && styles.upcomingRow]}
    >
      <StageDot stageId={performance.stageId} />
      <View style={styles.timeCol}>
        <Text style={[styles.time, isLive && styles.liveTime]}>{performance.startTime}</Text>
        {startsIn ? <Text style={styles.startsIn}>{startsIn}</Text> : null}
      </View>
      <View style={styles.main}>
        <Text style={styles.artist} numberOfLines={2}>
          {performance.artist}
        </Text>
        {stageName ? <Text style={styles.stage}>{stageName}</Text> : null}
        {performance.isCompetition ? <CompetitionLabel /> : null}
      </View>
      <View style={styles.actions}>
        {isLive ? <LiveBadge compact /> : isUpcoming ? <SoonBadge compact /> : null}
        <FavoriteStar isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} />
      </View>
    </Pressable>
  );
}

type NextProps = {
  performance: SchedulePerformance;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onPress?: () => void;
};

export function NextUpItem({ performance, isFavorite, onToggleFavorite, onPress }: NextProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.nextRow, pressed && styles.nextRowPressed]}
    >
      <View style={styles.nextBody}>
        <PerformanceTimeDateRow
          style={styles.nextTimeCol}
          time={formatTimeRange(performance.startTime, performance.endTime)}
          date={formatDayMonthLabel(performance.date)}
          timeStyle={styles.nextTime}
          dateStyle={styles.nextDate}
        />
        <PerformanceMetaDivider />
        <View style={styles.nextMain}>
          <Text style={styles.nextArtist} numberOfLines={2}>
            {performance.artist}
          </Text>
          {performance.isCompetition ? <CompetitionLabel /> : null}
        </View>
      </View>
      <View style={styles.nextFavorite}>
        <FavoriteStar isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} size={22} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  timelineLive: {
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    marginHorizontal: -spacing.screen,
    paddingHorizontal: spacing.screen,
    borderLeftWidth: 0,
    shadowColor: colors.live,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  timelineTime: {
    width: 52,
    ...typography.scheduleTime,
    color: colors.text,
    fontSize: 13,
  },
  timelineTimeLive: {
    color: colors.live,
  },
  timelineMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timelineText: {
    flex: 1,
    gap: 2,
  },
  timelineArtist: {
    flex: 1,
    ...typography.scheduleArtist,
    color: colors.text,
    fontSize: 13,
    lineHeight: 17,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  liveRow: {
    backgroundColor: 'rgba(255, 59, 48, 0.06)',
    borderLeftWidth: 3,
    borderLeftColor: colors.live,
    paddingLeft: spacing.sm,
  },
  upcomingRow: {
    backgroundColor: 'rgba(255, 193, 7, 0.06)',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: spacing.sm,
  },
  timeCol: {
    width: 52,
    gap: 2,
  },
  time: {
    ...typography.scheduleTime,
    color: colors.primary,
    fontSize: 13,
  },
  liveTime: {
    color: colors.live,
  },
  startsIn: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 9,
    textTransform: 'none',
    letterSpacing: 0,
  },
  main: {
    flex: 1,
    gap: 2,
    paddingTop: 1,
  },
  artist: {
    ...typography.scheduleArtist,
    color: colors.text,
    fontSize: 13,
    lineHeight: 17,
  },
  stage: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    textTransform: 'none',
    letterSpacing: 0,
  },
  actions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
    minWidth: 42,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  nextRowPressed: {
    opacity: 0.88,
  },
  nextBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  nextTimeCol: {
    flexShrink: 1,
    maxWidth: '46%',
  },
  nextTime: {
    ...performanceTimeWeightStyle('extraBold'),
  },
  nextDate: {},
  nextMain: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minWidth: 0,
  },
  nextFavorite: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  nextArtist: {
    ...typography.scheduleArtist,
    color: colors.text,
    fontSize: 13,
  },
});
