import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getCountdown } from '../utils/scheduleHelpers';

type Props = {
  targetDate: Date;
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function CountdownTimer({ targetDate }: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const countdown = getCountdown(targetDate, now);

  const items = [
    { value: pad(countdown.days), label: 'ДНЕЙ' },
    { value: pad(countdown.hours), label: 'ЧАСОВ' },
    { value: pad(countdown.minutes), label: 'МИНУТ' },
    { value: pad(countdown.seconds), label: 'СЕКУНД' },
  ];

  return (
    <View style={styles.card}>
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
  card: {
    backgroundColor: 'rgba(28, 28, 30, 0.8)',
    borderRadius: radius.xl,
    borderWidth: 0,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg + 2,
    paddingHorizontal: spacing.sm,
  },
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
});
