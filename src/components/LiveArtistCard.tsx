import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useAppData } from '../context/DataContext';
import { AutographSession, SchedulePerformance } from '../types';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { resolveLinkedArtist, resolveLinkedImageUrl } from '../utils/headlinersCore';
import {
  formatDayMonthLabel,
  formatSoonCountdown,
  formatTimeRange,
  getStageName,
  getTimedStatus,
  isStartingSoon,
  parseDateTime,
  TimedStatus,
  getEndDateTime,
} from '../utils/scheduleHelpers';
import { ArtistImage } from './ArtistImage';
import { ScreenTitle } from './ScreenTitle';
import { CompetitionLabel } from './CompetitionLabel';
import { LiveBadge } from './LiveBadge';
import { PerformanceTimeDateRow, performanceTimeWeightStyle } from './PerformanceTimeDateRow';
import { SoonBadge } from './SoonBadge';
import { MotionPressable } from './MotionPressable';

type CardProps = {
  performance: SchedulePerformance;
  stageName: string;
  status: TimedStatus;
  onPress?: () => void;
  now?: Date;
  style?: ViewStyle;
};

export function LiveArtistCard({ performance, stageName, status, onPress, now = new Date(), style }: CardProps) {
  const { data } = useAppData();
  const artist = resolveLinkedArtist(performance, data.headliners) || performance.artist;
  const imageUrl = resolveLinkedImageUrl(performance, data.headliners);
  const isLive = status === 'live';
  const isSoon =
    status === 'upcoming' && isStartingSoon(performance.date, performance.startTime, now);
  const startsIn = isSoon
    ? formatSoonCountdown(parseDateTime(performance.date, performance.startTime), now)
    : null;

  return (
    <MotionPressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.card,
        isLive && styles.cardLive,
        isSoon && styles.cardSoon,
        style,
      ]}
    >
      <ArtistImage imageUrl={imageUrl} artist={artist} style={styles.thumbnail} />
      <View style={styles.content}>
        <Text style={styles.artist} numberOfLines={1}>
          {artist}
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
    </MotionPressable>
  );
}

type HeroProps = {
  performance: SchedulePerformance;
  stageName: string;
  status: TimedStatus;
  now?: Date;
};

export function LiveHeroCard({ performance, stageName, status, now = new Date() }: HeroProps) {
  const { data } = useAppData();
  const artist = resolveLinkedArtist(performance, data.headliners) || performance.artist;
  const imageUrl = resolveLinkedImageUrl(performance, data.headliners);
  const isLive = status === 'live';
  const isSoon =
    status === 'upcoming' && isStartingSoon(performance.date, performance.startTime, now);
  const startsIn = isSoon
    ? formatSoonCountdown(parseDateTime(performance.date, performance.startTime), now)
    : null;

  return (
    <View style={styles.heroCard}>
      <ArtistImage imageUrl={imageUrl} artist={artist} style={styles.heroImage} variant="hero" />
      <LinearGradient
        colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.35)', colors.overlayStrong]}
        locations={[0, 0.45, 1]}
        style={styles.heroGradient}
      />
      <View style={styles.heroBadge}>
        {isLive ? <LiveBadge /> : isSoon ? <SoonBadge countdown={startsIn ?? undefined} /> : null}
      </View>
      <View style={styles.heroContent}>
        <ScreenTitle style={styles.heroArtist}>{artist}</ScreenTitle>
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

type AutographHeroProps = {
  session: AutographSession;
  now?: Date;
};

export function AutographHeroCard({ session, now = new Date() }: AutographHeroProps) {
  const { data } = useAppData();
  const artist = resolveLinkedArtist(session, data.headliners) || session.artist;
  const imageUrl = resolveLinkedImageUrl(session, data.headliners);
  const start = parseDateTime(session.date, session.startTime);
  const end = getEndDateTime(session.date, session.startTime, session.endTime);
  const status = getTimedStatus(start, end, now);
  const isLive = status === 'live';
  const isSoon = status === 'upcoming' && isStartingSoon(session.date, session.startTime, now);
  const startsIn = isSoon ? formatSoonCountdown(start, now) : null;
  const location =
    session.location?.trim() || getStageName(session.stageId, data.stages) || 'Автограф-сессия';

  return (
    <View style={styles.heroCard}>
      <ArtistImage imageUrl={imageUrl} artist={artist} style={styles.heroImage} variant="hero" />
      <LinearGradient
        colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.35)', colors.overlayStrong]}
        locations={[0, 0.45, 1]}
        style={styles.heroGradient}
      />
      <View style={styles.heroBadge}>
        {isLive ? <LiveBadge /> : isSoon ? <SoonBadge countdown={startsIn ?? undefined} /> : null}
      </View>
      <View style={styles.heroContent}>
        <ScreenTitle style={styles.heroArtist}>{artist}</ScreenTitle>
        <Text style={styles.heroStage}>{location}</Text>
        <PerformanceTimeDateRow
          style={styles.heroTimeWrap}
          time={
            startsIn
              ? `${formatTimeRange(session.startTime, session.endTime)} · ${startsIn}`
              : formatTimeRange(session.startTime, session.endTime)
          }
          date={formatDayMonthLabel(session.date)}
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
