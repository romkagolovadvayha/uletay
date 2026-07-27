import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type {
  MapPoiProperties,
  MapPoisGeoJson,
  MapZoneProperties,
  MapZonesGeoJson,
} from '../../types/map';
import { getPoiIconName, getZoneIconName } from '../../utils/map/layerStyles';

type ZoneFeature = GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>;
type PoiFeature = GeoJSON.Feature<GeoJSON.Point, MapPoiProperties>;

type Result =
  | { kind: 'zone'; id: string; name: string; icon: keyof typeof Ionicons.glyphMap; item: ZoneFeature }
  | { kind: 'poi'; id: string; name: string; icon: keyof typeof Ionicons.glyphMap; item: PoiFeature };

type Props = {
  zones?: MapZonesGeoJson;
  pois?: MapPoisGeoJson;
  onSelectZone: (zone: ZoneFeature) => void;
  onSelectPoi: (poi: PoiFeature) => void;
  style?: StyleProp<ViewStyle>;
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('ru');
}

export function MapSearchPanel({
  zones,
  pois,
  onSelectZone,
  onSelectPoi,
  style,
}: Props) {
  const [query, setQuery] = useState('');
  const normalizedQuery = normalize(query);

  const results = useMemo<Result[]>(() => {
    if (normalizedQuery.length < 2) return [];

    const zoneResults: Result[] = (zones?.features ?? [])
      .filter((zone) => normalize(`${zone.properties.name} ${zone.properties.description ?? ''}`).includes(normalizedQuery))
      .map((zone) => ({
        kind: 'zone',
        id: zone.properties.id,
        name: zone.properties.name,
        icon: getZoneIconName(zone.properties.zoneType),
        item: zone,
      }));
    const poiResults: Result[] = (pois?.features ?? [])
      .filter((poi) => normalize(`${poi.properties.name} ${poi.properties.description ?? ''}`).includes(normalizedQuery))
      .map((poi) => ({
        kind: 'poi',
        id: poi.properties.id,
        name: poi.properties.name,
        icon: getPoiIconName(poi.properties.category),
        item: poi,
      }));

    return [...zoneResults, ...poiResults].slice(0, 8);
  }, [normalizedQuery, pois?.features, zones?.features]);

  const select = (result: Result) => {
    setQuery('');
    if (result.kind === 'zone') onSelectZone(result.item);
    else onSelectPoi(result.item);
  };

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.inputWrap}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          accessibilityLabel="Поиск по карте"
          placeholder="Сцена, вода, медпункт…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          style={styles.input}
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Очистить поиск"
            onPress={() => setQuery('')}
            hitSlop={8}
            style={styles.clear}
          >
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {normalizedQuery.length >= 2 ? (
        <View style={styles.results}>
          {results.length ? (
            results.map((result) => (
              <Pressable
                key={`${result.kind}-${result.id}`}
                accessibilityRole="button"
                onPress={() => select(result)}
                style={({ pressed }) => [styles.result, pressed && styles.resultPressed]}
              >
                <View style={styles.resultIcon}>
                  <Ionicons name={result.icon} size={18} color={colors.primary} />
                </View>
                <Text numberOfLines={1} style={styles.resultName}>{result.name}</Text>
                <Text style={styles.resultKind}>{result.kind === 'zone' ? 'Зона' : 'Место'}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.empty}>Ничего не найдено</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    zIndex: 120,
  },
  inputWrap: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(28, 28, 30, 0.96)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  input: {
    flex: 1,
    minHeight: 46,
    ...typography.body,
    color: colors.text,
  },
  clear: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  results: {
    marginTop: spacing.xs,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  result: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  resultIcon: {
    width: 28,
    alignItems: 'center',
  },
  resultName: {
    flex: 1,
    ...typography.body,
    color: colors.text,
  },
  resultKind: {
    ...typography.caption,
    color: colors.textMuted,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    padding: spacing.lg,
    textAlign: 'center',
  },
});
