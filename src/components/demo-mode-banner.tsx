import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { appFont } from '../theme/typography';

export const DEMO_MODE_BANNER_HEIGHT = 34;

export function DemoModeBanner() {
  return (
    <SafeAreaView
      accessible
      accessibilityRole="alert"
      accessibilityLabel="Демо-режим. Показаны вымышленные данные."
      accessibilityLiveRegion="polite"
      edges={['top']}
      pointerEvents="none"
      style={styles.safeArea}
    >
      <View style={styles.banner}>
        <Ionicons name="flask-outline" size={15} color={colors.primaryText} />
        <Text numberOfLines={1} style={styles.label}>
          ДЕМО-РЕЖИМ · ДАННЫЕ ВЫМЫШЛЕНЫ
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 1000,
    backgroundColor: colors.primary,
  },
  banner: {
    height: DEMO_MODE_BANNER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  label: {
    ...appFont('bold'),
    flexShrink: 1,
    color: colors.primaryText,
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
