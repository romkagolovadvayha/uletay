import React from 'react';
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { appFont, typography } from '../theme/typography';

export const performanceMetaTextStyle = {
  fontSize: 10,
  color: colors.textSecondary,
  textTransform: 'none' as const,
  letterSpacing: 0,
};

export function performanceTimeWeightStyle(variant: 'medium' | 'extraBold' = 'medium'): Pick<TextStyle, 'fontFamily'> {
  return variant === 'extraBold' ? appFont('extraBold') : appFont('medium');
}

type Props = {
  time: string;
  date: string;
  timeStyle?: TextStyle;
  dateStyle?: TextStyle;
  dividerStyle?: ViewStyle;
  style?: ViewStyle;
};

export function PerformanceMetaDivider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

export function PerformanceTimeDateRow({ time, date, timeStyle, dateStyle, dividerStyle, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.time, timeStyle]} numberOfLines={1}>
        {time}
      </Text>
      <PerformanceMetaDivider style={dividerStyle} />
      <Text style={[styles.date, dateStyle]} numberOfLines={1}>
        {date}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  time: {
    ...performanceMetaTextStyle,
    flexShrink: 1,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 12,
    backgroundColor: colors.textSecondary,
    opacity: 0.45,
  },
  date: {
    ...typography.caption,
    ...performanceMetaTextStyle,
    flexShrink: 0,
  },
});
