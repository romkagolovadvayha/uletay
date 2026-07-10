import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getCountdown, isFestivalEnded, isFestivalOngoing } from '../utils/scheduleHelpers';

type Props = {
  targetDate: Date;
  festivalStartDate: string;
  festivalEndDate: string;
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function CountdownTimer({ targetDate, festivalStartDate, festivalEndDate }: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (isFestivalEnded(festivalEndDate, now)) {
    return null;
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
});
