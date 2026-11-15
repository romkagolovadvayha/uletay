import { ios, webStyle } from '../theme/ios';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNow } from '../hooks/useNow';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { SchedulePerformance } from '../types';
import {
  getCountdown,
  isFestivalFinished,
  isFestivalOngoing,
} from '../utils/scheduleHelpers';

type Props = {
  targetDate: Date;
  festivalStartDate: string;
  festivalEndDate: string;
  performances: SchedulePerformance[];
  compact?: boolean;
  prominent?: boolean;
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function CountdownTimer({
  targetDate,
  festivalStartDate,
  festivalEndDate,
  performances,
  compact = false,
  prominent = false,
}: Props) {
  const now = useNow(1000);

  const showFestivalEnded = isFestivalFinished(
    festivalStartDate,
    festivalEndDate,
    performances,
    now,
  );

  if (showFestivalEnded) {
    return (
      <View style={styles.liveContainer}>
        <View style={styles.endedBadge}>
          <Text style={styles.endedText}>ФЕСТИВАЛЬ ОКОНЧЕН</Text>
        </View>
      </View>
    );
  }

  if (isFestivalOngoing(festivalStartDate, festivalEndDate, now)) {
    return (
      <View style={styles.liveContainer}>
        <Text style={styles.title}>ФЕСТИВАЛЬ ИДЁТ</Text>
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
    );
  }

  const countdown = getCountdown(targetDate, now);

  const items = [
    { value: pad(countdown.days), label: 'ДНЕЙ' },
    { value: pad(countdown.hours), label: 'ЧАСОВ' },
    { value: pad(countdown.minutes), label: 'МИНУТ' },
    { value: pad(countdown.seconds), label: 'СЕКУНД' },
  ];

  return (
    <View>
      <Text style={[styles.title, compact && styles.titleCompact, prominent && styles.titleProminent, prominent && compact && styles.titleProminentCompact]}>ДО ФЕСТИВАЛЯ</Text>
      <View style={styles.row}>
        {items.map((item, index) => (
          <React.Fragment key={item.label}>
            <View style={styles.cell}>
              <Text style={[styles.value, compact && styles.valueCompact, prominent && styles.valueProminent, prominent && compact && styles.valueProminentCompact]}>{item.value}</Text>
              <Text style={[styles.label, compact && styles.labelCompact, prominent && styles.labelProminent]}>{item.label}</Text>
            </View>
            {index < items.length - 1 ? (
              <View style={[styles.divider, compact && styles.dividerCompact]} />
            ) : null}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.countdownTitle,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md + 2,
  },
  titleCompact: {
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 10,
    ...ios.caption,
  },
  titleProminent: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.4,
    color: colors.text,
    marginBottom: 14,
  },
  titleProminentCompact: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    ...typography.countdownValue,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  valueCompact: {
    fontSize: 24,
    letterSpacing: -0.3,
    marginBottom: 2,
    ...webStyle({ fontSize: 24, lineHeight: 30 }),
  },
  valueProminent: {
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  valueProminentCompact: {
    fontSize: 36,
    lineHeight: 42,
  },
  label: {
    ...typography.countdownLabel,
    color: colors.textSecondary,
  },
  labelCompact: {
    fontSize: 9,
    letterSpacing: 0.45,
    ...webStyle({ fontSize: 11, lineHeight: 15, letterSpacing: 0 }),
  },
  labelProminent: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.countdownDivider,
  },
  dividerCompact: {
    height: 27,
  },
  liveContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveBadge: {
    backgroundColor: colors.liveSurface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  liveText: {
    ...typography.countdownValue,
    color: colors.text,
    fontSize: 18,
    letterSpacing: 1,
  },
  endedBadge: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  endedText: {
    ...typography.countdownValue,
    color: colors.textSecondary,
    fontSize: 16,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
});
