import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { FilterTabs } from '../FilterTabs';
import type { MapFilterId, MapPoisGeoJson, MapZonesGeoJson } from '../../types/map';
import { spacing } from '../../theme/spacing';
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

  return <View style={[styles.wrap, embedded && styles.wrapEmbedded]}>
    <FilterTabs label="Категории карты" role="radiogroup" items={filters} value={value} onChange={onChange} inset={spacing.screen} surface />
  </View>;
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
});
