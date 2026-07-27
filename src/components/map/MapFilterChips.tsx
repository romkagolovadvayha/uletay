import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { MapFilterId, MapZonesGeoJson } from '../../types/map';
import { mapColors } from '../../theme/map';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { getActiveZoneTypes, ZONE_TYPE_LABELS } from '../../utils/map/layerStyles';

type Props = {
  zones?: MapZonesGeoJson;
  value: MapFilterId;
  onChange: (value: MapFilterId) => void;
  embedded?: boolean;
};

export function MapFilterChips({ zones, value, onChange, embedded = false }: Props) {
  const filters = useMemo(() => {
    const zoneTypes = getActiveZoneTypes(zones?.features ?? []);
    return [
      { id: 'all' as const, label: 'Все' },
      ...zoneTypes.map((zoneType) => ({
        id: zoneType as MapFilterId,
        label: ZONE_TYPE_LABELS[zoneType],
      })),
    ];
  }, [zones?.features]);

  if (filters.length <= 1) {
    return null;
  }

  return (
    <View style={[styles.wrap, embedded && styles.wrapEmbedded]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {filters.map((filter) => {
          const active = filter.id === value;
          return (
            <Pressable
              key={filter.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(filter.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: spacing.sm,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 100,
  },
  wrapEmbedded: {
    position: 'relative',
    top: 0,
  },
  row: {
    paddingHorizontal: spacing.screen,
    gap: spacing.sm,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: mapColors.chipInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: mapColors.chipActive,
  },
  chipText: {
    ...typography.caption,
    color: mapColors.chipTextInactive,
  },
  chipTextActive: {
    color: mapColors.chipTextActive,
    fontWeight: '600',
  },
});
