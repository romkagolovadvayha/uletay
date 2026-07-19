import React from 'react';
import { StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import { MotionPressable } from './MotionPressable';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type Props = {
  label: string;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function PrimaryButton({ label, onPress, style, textStyle }: Props) {
  return (
    <MotionPressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, style]}
    >
      <Text style={[styles.label, textStyle]}>{label}</Text>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 17,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  label: {
    ...typography.button,
    color: colors.primaryText,
  },
});
