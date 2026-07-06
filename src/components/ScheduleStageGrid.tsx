import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SchedulePerformance, Stage } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getStageColor } from '../config/api';
import {
  formatFestivalClock,
  formatFestivalDayTimelineLabel,
  getNowFestivalDayTimelineMinutes,
} from '../utils/festivalTime';
import {
  getPerformanceHighlight,
  isSameFestivalDay,
  type PerformanceHighlight,
} from '../utils/scheduleHelpers';
import {
  getDayScheduleBounds,
  getHourMarkers,
  getScheduleGridPixelsPerMinute,
  groupPerformancesByStage,
  layoutPerformanceCards,
  minutesToGridOffset,
  SCHEDULE_GRID_CARD_GAP,
  SCHEDULE_GRID_COLUMN_GAP,
  SCHEDULE_GRID_TIME_AXIS_WIDTH,
} from '../utils/scheduleGrid';
import { ScheduleGridCard } from './ScheduleGridCard';

type Props = {
  performances: SchedulePerformance[];
  stages: Stage[];
  selectedDate: string;
  now: Date;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onPressPerformance: (performanceId: string) => void;
};

export function ScheduleStageGrid({
  performances,
  stages,
  selectedDate,
  now,
  isFavorite,
  onToggleFavorite,
  onPressPerformance,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const contentWidth = Math.max(0, layoutWidth - spacing.screen * 2);
  const columnsWidth = contentWidth - SCHEDULE_GRID_TIME_AXIS_WIDTH;
  const columnWidth =
    (columnsWidth - SCHEDULE_GRID_COLUMN_GAP * Math.max(stages.length - 1, 0)) / Math.max(stages.length, 1);

  const { dayStart, gridHeight, hourMarkers, performancesByStage, highlights, pixelsPerMinute } = useMemo(() => {
    const bounds = getDayScheduleBounds(performances, selectedDate);
    const ppm = getScheduleGridPixelsPerMinute(performances);
    const grouped = groupPerformancesByStage(performances);
    const highlightMap = performances.reduce<Record<string, PerformanceHighlight>>((acc, performance) => {
      acc[performance.id] = getPerformanceHighlight(performance, performances, now);
      return acc;
    }, {});

    let maxBottom = (bounds.end - bounds.start) * ppm;
    for (const stagePerformances of Object.values(grouped)) {
      if (!stagePerformances?.length) {
        continue;
      }

      for (const card of layoutPerformanceCards(stagePerformances, selectedDate, bounds.start, ppm)) {
        maxBottom = Math.max(maxBottom, card.top + card.height);
      }
    }

    return {
      dayStart: bounds.start,
      gridHeight: maxBottom + SCHEDULE_GRID_CARD_GAP,
      hourMarkers: getHourMarkers(bounds.start, bounds.end),
      performancesByStage: grouped,
      highlights: highlightMap,
      pixelsPerMinute: ppm,
    };
  }, [now, performances, selectedDate]);

  const showNowLine = isSameFestivalDay(selectedDate, now);
  const nowTimeline = getNowFestivalDayTimelineMinutes(now, selectedDate);
  const nowTop = nowTimeline !== null ? minutesToGridOffset(nowTimeline, dayStart, pixelsPerMinute) : -1;
  const nowInRange = showNowLine && nowTop >= 0 && nowTop <= gridHeight;

  useEffect(() => {
    if (!isSameFestivalDay(selectedDate, new Date())) {
      return;
    }

    const timeline = getNowFestivalDayTimelineMinutes(new Date(), selectedDate);
    if (timeline === null) {
      return;
    }

    const scrollTop = minutesToGridOffset(timeline, dayStart, pixelsPerMinute);
    if (scrollTop < 0 || scrollTop > gridHeight) {
      return;
    }

    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, scrollTop - 140), animated: false });
    }, 80);

    return () => clearTimeout(timer);
  }, [selectedDate, dayStart, gridHeight, pixelsPerMinute]);

  if (performances.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Нет выступлений в этот день</Text>
      </View>
    );
  }

  if (layoutWidth === 0) {
    return (
      <View
        style={styles.wrap}
        onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)}
      />
    );
  }

  return (
    <View
      style={styles.wrap}
      onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)}
    >
      <View style={[styles.headerRow, { width: contentWidth }]}>
        <View style={styles.timeAxisHeader} />
        {stages.map((stage, index) => (
          <View
            key={stage.id}
            style={[
              styles.stageHeader,
              {
                width: columnWidth,
                marginLeft: index === 0 ? 0 : SCHEDULE_GRID_COLUMN_GAP,
                borderTopColor: getStageColor(stage.id, stages),
              },
            ]}
          >
            <Text style={styles.stageHeaderText} numberOfLines={2}>
              {stage.shortName.toUpperCase()}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.screen }]}
        showsVerticalScrollIndicator
      >
        <View style={[styles.grid, { width: contentWidth, height: gridHeight }]}>
          {hourMarkers.map((minute) => {
            const top = minutesToGridOffset(minute, dayStart, pixelsPerMinute);
            return (
              <View key={minute} style={[styles.hourLine, { top }]} pointerEvents="none">
                <Text style={styles.hourLabel}>{formatFestivalDayTimelineLabel(minute, selectedDate)}</Text>
                <View style={styles.hourRule} />
              </View>
            );
          })}

          <View style={styles.columnsRow}>
            <View style={styles.timeAxisSpacer} />

            {stages.map((stage, index) => {
              const stagePerformances = performancesByStage[stage.id] ?? [];
              const cards = layoutPerformanceCards(stagePerformances, selectedDate, dayStart, pixelsPerMinute);

              return (
                <View
                  key={stage.id}
                  style={[
                    styles.column,
                    {
                      width: columnWidth,
                      marginLeft: index === 0 ? 0 : SCHEDULE_GRID_COLUMN_GAP,
                    },
                  ]}
                >
                  {cards.map((card) => (
                    <ScheduleGridCard
                      key={card.performance.id}
                      performance={card.performance}
                      top={card.top}
                      height={card.height}
                      highlight={highlights[card.performance.id] ?? 'default'}
                      now={now}
                      isFavorite={isFavorite(card.performance.id)}
                      onToggleFavorite={() => onToggleFavorite(card.performance.id)}
                      onPress={() => onPressPerformance(card.performance.id)}
                    />
                  ))}
                </View>
              );
            })}
          </View>

          {nowInRange ? (
            <View style={[styles.nowLine, { top: nowTop }]} pointerEvents="none">
              <Text style={styles.nowTime}>{formatFestivalClock(now)}</Text>
              <View style={styles.nowRule} />
              <View style={styles.nowDot} />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xs,
  },
  timeAxisHeader: {
    width: SCHEDULE_GRID_TIME_AXIS_WIDTH,
  },
  stageHeader: {
    borderTopWidth: 3,
    paddingTop: 0,
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  stageHeaderText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  grid: {
    position: 'relative',
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 0,
  },
  hourLabel: {
    width: SCHEDULE_GRID_TIME_AXIS_WIDTH,
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    textTransform: 'none',
    letterSpacing: 0,
    marginTop: -5,
  },
  hourRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  columnsRow: {
    flex: 1,
    flexDirection: 'row',
    zIndex: 1,
  },
  timeAxisSpacer: {
    width: SCHEDULE_GRID_TIME_AXIS_WIDTH,
  },
  column: {
    position: 'relative',
    height: '100%',
  },
  nowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 5,
  },
  nowTime: {
    width: SCHEDULE_GRID_TIME_AXIS_WIDTH,
    ...typography.scheduleTime,
    color: colors.live,
    fontSize: 11,
    marginTop: -8,
  },
  nowRule: {
    flex: 1,
    height: 2,
    backgroundColor: colors.live,
    shadowColor: colors.live,
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  nowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.live,
    marginLeft: -1,
  },
  empty: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
  },
});
