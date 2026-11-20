import { webStyle } from '../theme/ios';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
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

  if(Platform.OS!=='web')return <View style={[styles.card,{top,height,padding:0,borderWidth:0,opacity:isPast?.55:1},isLive&&styles.cardLive,isUpcoming&&styles.cardUpcoming]}><MotionPressable accessibilityRole="button" accessibilityLabel={`${performance.artist}, ${formatTimeRange(performance.startTime,performance.endTime)}`} onPress={onPress} style={{flex:1,padding:7,paddingRight:22,justifyContent:'center',gap:3}}><Text numberOfLines={1} style={{fontFamily:'FestivalSansMedium',fontSize:10,lineHeight:13,color:isLive?colors.live:colors.textSecondary}}>{performance.startTime}{height>=76?` – ${performance.endTime}`:''}</Text><Text numberOfLines={height>=76?3:1} style={{fontFamily:'FestivalDisplay',fontSize:15,lineHeight:17,color:colors.text,textTransform:'uppercase'}}>{performance.artist}</Text>{height>=110&&(isLive||isUpcoming)?<View style={{alignSelf:'flex-start'}}>{isLive?<LiveBadge compact/>:<SoonBadge compact countdown={soonCountdown}/>}</View>:null}</MotionPressable>{onToggleFavorite?<View style={{position:'absolute',top:-3,right:-5,zIndex:5,overflow:'visible'}}><FavoriteStar isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} size={16} label={performance.artist}/></View>:null}</View>;

  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={`${performance.artist}, ${formatTimeRange(performance.startTime, performance.endTime)}`}
      onPress={onPress}
      style={[
        styles.card,
        {
          top,
          height,
          opacity: isPast ? (Platform.OS === 'web' ? 0.7 : 0.42) : 1,
          justifyContent: 'center',
        },
        isLive && styles.cardLive,
        isUpcoming && styles.cardUpcoming,
      ]}
    >
      <View style={styles.cardBody}>
        <View style={styles.header}>
          <Text style={[styles.time, isLive && styles.timeLive]} numberOfLines={Platform.OS === 'web' ? 2 : 1}>
            {Platform.OS === 'web' ? `${performance.startTime}\n${performance.endTime}` : formatTimeRange(performance.startTime, performance.endTime)}
          </Text>
          {onToggleFavorite ? (
            <FavoriteStar isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} size={16} label={performance.artist} />
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
    overflow: 'visible',
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
    ...webStyle({ fontSize: 11, lineHeight: 14 }),
  },
  timeLive: {
    color: colors.live,
  },
  artist: {
    ...typography.scheduleArtist,
    ...(Platform.OS!=='web'?{fontFamily:'FestivalDisplay'}:{}),
    color: colors.text,
    fontSize: 12,
    lineHeight: 14,
    ...webStyle({ fontFamily: 'FestivalDisplay', fontSize: 16, lineHeight: 18, fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase' }),
  },
  badgeRow: {
    alignSelf: 'flex-start',
  },
});
