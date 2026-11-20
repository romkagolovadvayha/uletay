import { ios, webStyle, webLabel } from '../../theme/ios';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { DeferredIonicons } from '../DeferredIonicons';
import { MotionPressable } from '../MotionPressable';
import { colors } from '../../theme/colors';
import { mapControlLayout } from '../../theme/map';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { appFont } from '../../theme/typography';

export function MapDirectionsButton({ onPress }: { onPress: () => void }) {
  return (
    <MotionPressable
      nativeID="festival-map-directions"
      accessibilityRole="button"
      accessibilityLabel="Как добраться до фестиваля"
      onPress={onPress}
      style={styles.button}
    >
      <DeferredIonicons name="navigate" size={20} color={colors.background} />
      <Text style={styles.text}>{webLabel('Как добраться')}</Text>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: spacing.screen,
    right: spacing.screen,
    bottom: mapControlLayout.directionsBottom,
    zIndex: 24,
    minHeight: mapControlLayout.directionsHeight,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...ios.button,
  },
  text: {
    ...appFont('bold'),
    color: colors.background,
    fontSize: 14,
    letterSpacing: 0.5,
    ...webStyle({ fontSize: 17, lineHeight: 22, letterSpacing: 0 }),
  },
});
