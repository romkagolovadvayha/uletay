import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { mapColors } from '../../theme/map';
import { spacing } from '../../theme/spacing';

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
  onFestival: () => void;
  followUser: boolean;
};

export function MapFabGroup({ onLocate, onFestival, followUser }: Props) {
  return (
    <View style={styles.col}>
      <MapFab icon="locate" label="Моё местоположение" onPress={onLocate} active={followUser} />
      <MapFab icon="flag-outline" label="К фестивалю" onPress={onFestival} />
    </View>
  );
}

const styles = StyleSheet.create({
  col: {
    position: 'absolute',
    right: spacing.screen,
    bottom: 160,
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
});
