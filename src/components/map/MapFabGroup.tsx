import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { mapColors } from '../../theme/map';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type FabProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
};

function MapFab({ icon, label, onPress, active }: FabProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        active && styles.fabActive,
        pressed && styles.fabPressed,
      ]}
    >
      <Ionicons name={icon} size={22} color={active ? '#000' : '#FFF'} />
    </Pressable>
  );
}

type Props = {
  onLocate: () => void;
  onDirections: () => void;
  followUser: boolean;
  bottomOffset?: number;
};

export function MapFabGroup({ onLocate, onDirections, followUser, bottomOffset = 160 }: Props) {
  return (
    <View style={[styles.col, { bottom: bottomOffset }]}>
      <MapFab icon="locate" label="Моё местоположение" onPress={onLocate} active={followUser} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Как добраться до фестиваля"
        onPress={onDirections}
        style={({ pressed }) => [styles.directions, pressed && styles.fabPressed]}
      >
        <Ionicons name="navigate-outline" size={20} color="#000" />
        <Text style={styles.directionsLabel}>Как добраться</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  col: {
    position: 'absolute',
    right: spacing.screen,
    alignItems: 'flex-end',
    gap: spacing.sm,
    zIndex: 25,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: mapColors.fabBg,
    borderWidth: 1,
    borderColor: mapColors.fabBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabActive: {
    backgroundColor: mapColors.chipActive,
  },
  fabPressed: {
    transform: [{ scale: 0.94 }],
  },
  directions: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: mapColors.chipActive,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    boxShadow: '0 4px 14px rgba(0,0,0,0.34)',
  },
  directionsLabel: {
    ...typography.button,
    color: '#000',
  },
});
