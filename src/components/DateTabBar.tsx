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
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Дни фестиваля"
      style={styles.container}
    >
      <View style={styles.row}>
        {dates.map((date) => {
          const isActive = date === selectedDate;
          const { day, month, weekday } = formatDateTabParts(date);
          const shortWeekday = weekday.slice(0, 3);

          return (
            <MotionPressable
              key={date}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              aria-selected={isActive}
              onPress={() => onSelect(date)}
              style={[
                styles.tab,
                isActive && (variant === 'red' ? styles.tabRedActive : styles.tabYellowActive),
              ]}
            >
              <Text style={[styles.day, isActive && styles.textActive]}>{day}</Text>
              <Text style={[styles.month, isActive && styles.textActive]}>{month}</Text>
              <Text
                accessibilityLabel={weekday}
                style={[styles.weekday, isActive && styles.weekdayActive]}
              >
                {shortWeekday}
              </Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 60,
    borderRadius: radius.md,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: 'center',
    backgroundColor: 'transparent',
    gap: 1,
  },
  tabRedActive: {
    backgroundColor: colors.liveSurface,
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
    fontSize: 12,
    lineHeight: 14,
    color: colors.text,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  weekday: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  weekdayActive: {
    color: colors.text,
  },
  textActive: {
    color: colors.text,
  },
});
