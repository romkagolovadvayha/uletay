import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { DeferredIonicons } from '../DeferredIonicons';
import { MotionPressable } from '../MotionPressable';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { appFont } from '../../theme/typography';

export function MapDirectionsButton({ onPress }: { onPress: () => void }) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel="Как добраться до фестиваля"
      onPress={onPress}
      style={styles.button}
    >
      <DeferredIonicons name="navigate" size={20} color={colors.background} />
      <Text style={styles.text}>КАК ДОБРАТЬСЯ</Text>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: spacing.screen,
    right: spacing.screen,
    bottom: spacing.lg,
    zIndex: 24,
    minHeight: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  text: {
    ...appFont('bold'),
    color: colors.background,
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
