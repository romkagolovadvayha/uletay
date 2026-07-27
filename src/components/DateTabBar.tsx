import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MotionPressable } from './MotionPressable';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';
import { formatDateTabParts } from '../utils/scheduleHelpers';

type Props = {
  dates: string[];
  selectedDate: string;
  onSelect: (date: string) => void;
  variant?: 'red' | 'yellow';
};

export function DateTabBar({ dates, selectedDate, onSelect, variant = 'red' }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {dates.map((date) => {
          const isActive = date === selectedDate;
          const { day, month, weekday } = formatDateTabParts(date);

          return (
            <MotionPressable
              key={date}
              accessibilityRole="button"
              onPress={() => onSelect(date)}
              style={[
                styles.tab,
                isActive && (variant === 'red' ? styles.tabRedActive : styles.tabYellowActive),
              ]}
            >
              <Text style={[styles.day, isActive && styles.textActive]}>{day}</Text>
              <Text style={[styles.month, isActive && styles.textActive]}>{month}</Text>
              <Text style={[styles.weekday, isActive && styles.weekdayActive]}>{weekday}</Text>
            </MotionPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.md / 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
  },
  tab: {
    minWidth: 60,
    borderRadius: radius.md,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: 'center',
    backgroundColor: 'transparent',
    gap: 1,
  },
  tabRedActive: {
    backgroundColor: colors.live,
  },
  tabYellowActive: {
    backgroundColor: colors.primary,
  },
  day: {
    ...appFont('extraBold'),
    fontSize: 18,
    lineHeight: 22,
    color: colors.text,
    letterSpacing: 0,
  },
  month: {
    ...appFont('semiBold'),
    fontSize: 10,
    lineHeight: 13,
    color: colors.text,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  weekday: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  weekdayActive: {
    color: 'rgba(255, 255, 255, 0.72)',
  },
  textActive: {
    color: colors.text,
  },
});
