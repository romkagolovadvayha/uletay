import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';
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

type ScrollMetrics = {
  viewportWidth: number;
  contentWidth: number;
  offsetX: number;
};

const SCROLL_END_THRESHOLD = 4;
const END_FADE_GRADIENT =
  'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.72) 72%, rgba(0, 0, 0, 0.9) 100%)';
const endFadeGradientStyle = Platform.select<ViewStyle & { backgroundImage?: string }>({
  web: {
    backgroundImage: END_FADE_GRADIENT,
  },
  default: {
    experimental_backgroundImage: END_FADE_GRADIENT,
  },
});

export function MapFilterChips({ zones, value, onChange, embedded = false }: Props) {
  const scrollMetrics = useRef<ScrollMetrics>({
    viewportWidth: 0,
    contentWidth: 0,
    offsetX: 0,
  });
  const [showEndFade, setShowEndFade] = useState(false);

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

  const updateScrollMetrics = useCallback((next: Partial<ScrollMetrics>) => {
    const metrics = { ...scrollMetrics.current, ...next };
    scrollMetrics.current = metrics;
    const remaining = metrics.contentWidth - metrics.viewportWidth - metrics.offsetX;
    const shouldShow = metrics.contentWidth > metrics.viewportWidth && remaining > SCROLL_END_THRESHOLD;
    setShowEndFade((current) => (current === shouldShow ? current : shouldShow));
  }, []);

  if (filters.length <= 1) {
    return null;
  }

  return (
    <View style={[styles.wrap, embedded && styles.wrapEmbedded]}>
      <ScrollView
        horizontal
        accessibilityLabel="Категории карты"
        accessibilityHint="Прокрутите по горизонтали, чтобы увидеть остальные категории"
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        contentContainerStyle={styles.row}
        onLayout={(event) => {
          updateScrollMetrics({ viewportWidth: event.nativeEvent.layout.width });
        }}
        onContentSizeChange={(contentWidth) => {
          updateScrollMetrics({ contentWidth });
        }}
        onScroll={(event) => {
          updateScrollMetrics({ offsetX: Math.max(0, event.nativeEvent.contentOffset.x) });
        }}
      >
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
      {showEndFade ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[styles.endFade, endFadeGradientStyle]}
        />
      ) : null}
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
  endFade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 64,
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
