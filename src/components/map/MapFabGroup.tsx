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
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onLocate: () => void;
  onFestival?: () => void;
  onDirections?: () => void;
  onSavedPlaces?: () => void;
  followUser: boolean;
  bottomOffset?: number;
  compact?: boolean;
  viewMode?: '2d' | '3d';
  onToggleView?: () => void;
};

export function MapFabGroup({
  onZoomIn,
  onZoomOut,
  onLocate,
  onFestival,
  onDirections,
  onSavedPlaces,
  followUser,
  compact = false,
  viewMode = '3d',
  onToggleView,
  bottomOffset = compact ? 80 : 96,
}: Props) {
  return (
    <View style={[styles.col, compact && styles.compact, { bottom: bottomOffset }]}>
      {onToggleView ? <MotionPressable accessibilityRole="button"
        accessibilityLabel={viewMode === '3d' ? 'Показать карту сверху' : 'Показать объёмную карту'}
        onPress={onToggleView} style={styles.fab}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{viewMode === '3d' ? '2D' : '3D'}</Text>
      </MotionPressable> : null}
      {onZoomIn ? <MapFab icon="add" label="Приблизить карту" onPress={onZoomIn} /> : null}
      {onZoomOut ? <MapFab icon="remove" label="Отдалить карту" onPress={onZoomOut} /> : null}
      <MapFab icon="locate" label="Моё местоположение" onPress={onLocate} active={followUser} />
      {onFestival ? (
        <MapFab icon="flag" label="Центр фестиваля" onPress={onFestival} />
      ) : null}
      {onSavedPlaces ? (
        <MapFab icon="bookmark" label="Машина и палатка" onPress={onSavedPlaces} />
      ) : null}
      {onDirections ? (
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Как добраться до фестиваля"
          onPress={onDirections}
          style={styles.directions}
        >
          <Ionicons name="navigate" size={20} color={colors.primaryText} />
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
  compact: {
    width: 160,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
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
