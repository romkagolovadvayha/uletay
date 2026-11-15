import { ios } from '../../theme/ios';
import React, { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FilterTabs } from '../FilterTabs';
import type { MapFilterId, MapPoisGeoJson, MapZonesGeoJson } from '../../types/map';
import { mapColors } from '../../theme/map';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { MotionPressable } from '../MotionPressable';
import {
  getMapFilters,
} from '../../utils/map/layerStyles';

type Props = {
  zones?: MapZonesGeoJson;
  pois?: MapPoisGeoJson;
  value: MapFilterId;
  onChange: (value: MapFilterId) => void;
  embedded?: boolean;
};

export function MapFilterChips({ zones, pois, value, onChange, embedded = false }: Props) {
  const filters = useMemo(() => {
    return getMapFilters(zones, pois);
  }, [pois, zones]);

  if (filters.length <= 1) {
    return null;
  }

  if (Platform.OS === 'web') return <View style={[styles.wrap, embedded && styles.wrapEmbedded]}>
    <FilterTabs label="Категории карты" role="radiogroup" items={filters} value={value} onChange={onChange} inset={spacing.screen} surface />
  </View>;

  return (
    <View style={[styles.wrap, embedded && styles.wrapEmbedded]}>
      <ScrollView
        horizontal
        accessibilityRole="radiogroup"
        accessibilityLabel="Категории карты"
        accessibilityHint="Прокрутите по горизонтали, чтобы увидеть остальные категории"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {filters.map((filter) => {
          const active = filter.id === value;
          return (
            <MotionPressable
              key={filter.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              aria-checked={active}
              onPress={() => onChange(filter.id)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{filter.label}</Text>
            </MotionPressable>
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
    ...ios.glass,
  },
  chipActive: {
    backgroundColor: mapColors.chipActive,
  },
  chipText: {
    ...typography.caption,
    color: mapColors.chipTextInactive,
    ...ios.chipLabel,
  },
  chipTextActive: {
    color: mapColors.chipTextActive,
    fontWeight: '600',
  },
});
