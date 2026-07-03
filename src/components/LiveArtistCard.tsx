import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SchedulePerformance } from '../types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import {
  formatDayMonthLabel,
  formatSoonCountdown,
  formatTimeRange,
  isStartingSoon,
  parseDateTime,
  TimedStatus,
} from '../utils/scheduleHelpers';
import { getRemoteImageSource } from '../utils/imageSource';
import { CompetitionLabel } from './CompetitionLabel';
import { LiveBadge } from './LiveBadge';
import { PerformanceTimeDateRow, performanceTimeWeightStyle } from './PerformanceTimeDateRow';
import { SoonBadge } from './SoonBadge';

type CardProps = {
  performance: SchedulePerformance;
  stageName: string;
  status: TimedStatus;
  onPress?: () => void;
  imageSource?: number;
  now?: Date;
  style?: ViewStyle;
};

export function LiveArtistCard({ performance, stageName, status, onPress, imageSource, now = new Date(), style }: CardProps) {
  const isLive = status === 'live';
  const isSoon =
    status === 'upcoming' && isStartingSoon(performance.date, performance.startTime, now);
  const startsIn = isSoon
    ? formatSoonCountdown(parseDateTime(performance.date, performance.startTime), now)
    : null;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isLive && styles.cardLive,
        isSoon && styles.cardSoon,
        style,
        pressed && styles.pressed,
      ]}
    >
      <Image
        source={getRemoteImageSource(performance.imageUrl, imageSource)}
        style={styles.thumbnail}
        contentFit="cover"
      />
      <View style={styles.content}>
        <Text style={styles.artist} numberOfLines={1}>
          {performance.artist}
        </Text>
        {performance.isCompetition ? <CompetitionLabel /> : null}
        <Text style={styles.stage}>{stageName}</Text>
        <PerformanceTimeDateRow
          style={styles.timeWrap}
          time={
            startsIn
              ? `${formatTimeRange(performance.startTime, performance.endTime)} · ${startsIn}`
              : formatTimeRange(performance.startTime, performance.endTime)
          }
          date={formatDayMonthLabel(performance.date)}
          timeStyle={styles.cardTime}
        />
      </View>
      <View style={styles.badgeWrap}>
        {isLive ? <LiveBadge compact /> : isSoon ? <SoonBadge compact countdown={startsIn ?? undefined} /> : null}
      </View>
    </Pressable>
  );
}

type HeroProps = {
  performance: SchedulePerformance;
  stageName: string;
  status: TimedStatus;
  imageSource?: number;
  now?: Date;
};

export function LiveHeroCard({ performance, stageName, status, imageSource, now = new Date() }: HeroProps) {
  const isLive = status === 'live';
  const isSoon =
    status === 'upcoming' && isStartingSoon(performance.date, performance.startTime, now);
  const startsIn = isSoon
    ? formatSoonCountdown(parseDateTime(performance.date, performance.startTime), now)
    : null;

  return (
    <View style={styles.heroCard}>
      <Image
        source={getRemoteImageSource(performance.imageUrl, imageSource)}
        style={styles.heroImage}
        contentFit="cover"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.35)', colors.overlayStrong]}
        locations={[0, 0.45, 1]}
        style={styles.heroGradient}
      />
      <View style={styles.heroBadge}>
        {isLive ? <LiveBadge /> : isSoon ? <SoonBadge countdown={startsIn ?? undefined} /> : null}
      </View>
      <View style={styles.heroContent}>
        <Text style={styles.heroArtist}>{performance.artist}</Text>
        {performance.isCompetition ? <CompetitionLabel style={styles.heroCompetition} /> : null}
        <Text style={styles.heroStage}>{stageName}</Text>
        <PerformanceTimeDateRow
          style={styles.heroTimeWrap}
          time={
            startsIn
              ? `${formatTimeRange(performance.startTime, performance.endTime)} · ${startsIn}`
              : formatTimeRange(performance.startTime, performance.endTime)
          }
          date={formatDayMonthLabel(performance.date)}
          timeStyle={styles.heroTime}
          dateStyle={styles.heroDate}
          dividerStyle={styles.heroDivider}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.card,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    position: 'relative',
    minHeight: 96,
  },
  cardLive: {
    borderColor: colors.liveGlow,
  },
  cardSoon: {
    borderColor: 'rgba(245, 197, 24, 0.35)',
  },
  pressed: {
    opacity: 0.94,
  },
  thumbnail: {
    width: 76,
    height: 76,
    borderRadius: radius.md - 2,
    backgroundColor: colors.surfaceCard,
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
    paddingRight: spacing.xxxl,
    gap: 3,
  },
  artist: {
    ...typography.artistName,
    color: colors.text,
  },
  stage: {
    ...typography.artistStage,
    color: colors.primary,
    marginTop: 1,
  },
  timeWrap: {
    marginTop: 2,
  },
  cardTime: {
    ...performanceTimeWeightStyle('medium'),
  },
  badgeWrap: {
    position: 'absolute',
    top: spacing.card,
    right: spacing.card,
  },
  heroCard: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    minHeight: 380,
    backgroundColor: colors.surface,
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  heroGradient: {
    ...StyleSheet.absoluteFill,
  },
  heroBadge: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
  },
  heroContent: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.xl,
    gap: 5,
  },
  heroArtist: {
    ...typography.heroArtist,
    color: colors.text,
  },
  heroCompetition: {
    marginTop: -2,
    marginBottom: -2,
  },
  heroStage: {
    ...typography.heroStage,
    color: colors.primary,
  },
  heroTimeWrap: {
    flexWrap: 'wrap',
  },
  heroTime: {
    ...performanceTimeWeightStyle('medium'),
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.72)',
  },
  heroDivider: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  heroDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.72)',
    textTransform: 'none',
    letterSpacing: 0,
  },
});
