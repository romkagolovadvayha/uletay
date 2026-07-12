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
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function CountdownTimer({
  targetDate,
  festivalStartDate,
  festivalEndDate,
  performances,
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
      <Text style={styles.title}>ДО ФЕСТИВАЛЯ</Text>
      <View style={styles.row}>
        {items.map((item, index) => (
          <React.Fragment key={item.label}>
            <View style={styles.cell}>
              <Text style={styles.value}>{item.value}</Text>
              <Text style={styles.label}>{item.label}</Text>
            </View>
            {index < items.length - 1 ? <View style={styles.divider} /> : null}
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
  label: {
    ...typography.countdownLabel,
    color: colors.textSecondary,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.countdownDivider,
  },
  liveContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveBadge: {
    backgroundColor: colors.live,
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
    backgroundColor: colors.surfaceElevated,
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
