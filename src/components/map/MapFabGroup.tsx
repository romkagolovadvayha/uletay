import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { mapColors } from '../../theme/map';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { spacing } from '../../theme/spacing';
import { MotionPressable } from '../MotionPressable';
import { typography } from '../../theme/typography';

type FabProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
};

function MapFab({ icon, label, onPress, active }: FabProps) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.fab, active && styles.fabActive]}
    >
      <Ionicons
        name={icon}
        size={22}
        color={active ? colors.primaryText : colors.text}
      />
    </MotionPressable>
  );
}

type Props = {
  onLocate: () => void;
  onFestival?: () => void;
  onDirections?: () => void;
  onSavedPlaces?: () => void;
  followUser: boolean;
  bottomOffset?: number;
};

export function MapFabGroup({
  onLocate,
  onFestival,
  onDirections,
  onSavedPlaces,
  followUser,
  bottomOffset = 160,
}: Props) {
  return (
    <View style={[styles.col, { bottom: bottomOffset }]}>
      <MapFab icon="locate" label="Моё местоположение" onPress={onLocate} active={followUser} />
      {onFestival ? (
        <MapFab icon="flag-outline" label="Центр фестиваля" onPress={onFestival} />
      ) : null}
      {onSavedPlaces ? (
        <MapFab icon="bookmark-outline" label="Машина и палатка" onPress={onSavedPlaces} />
      ) : null}
      {onDirections ? (
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Как добраться до фестиваля"
          onPress={onDirections}
          style={styles.directions}
        >
          <Ionicons name="navigate-outline" size={20} color={colors.primaryText} />
          <Text style={styles.directionsLabel}>Как добраться</Text>
        </MotionPressable>
      ) : null}
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
    boxShadow: shadows.mapDirections,
  },
  directionsLabel: {
    ...typography.button,
    color: colors.primaryText,
  },
});
