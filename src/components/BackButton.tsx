import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { ios } from '../theme/ios';
import { MotionPressable } from './MotionPressable';
import type { BackButtonProps } from './BackButton.types';

export function BackButton({ onPress, style, accessibilityHint, hitSlop }: BackButtonProps) {
  return <View style={[style, styles.frame]}>
    <MotionPressable onPress={onPress} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel="Назад" accessibilityHint={accessibilityHint} style={styles.button}>
      <Ionicons name="chevron-back" size={25} color={colors.text} />
    </MotionPressable>
  </View>;
}

const styles = StyleSheet.create({
  frame: { width: 44, height: 44, minWidth: 44, minHeight: 44, flexGrow: 0, flexShrink: 0, padding: 0, borderWidth: 0, backgroundColor: 'transparent' },
  button: { ...ios.glass, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
