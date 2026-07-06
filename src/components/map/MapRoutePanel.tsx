import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CombinedRoute, LatLng } from '../../types/map';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatDuration } from '../../utils/map/geo';

type Props = {
  route: CombinedRoute;
  userLocation: LatLng | null;
  onClear: () => void;
};

export function MapRoutePanel({ route, userLocation, onClear }: Props) {
  const external = route.segments.find((s) => s.kind === 'external');

  const openNavigator = () => {
    if (!userLocation || !external?.coordinates.length) return;
    const last = external.coordinates[external.coordinates.length - 1];
    const url = `https://yandex.ru/maps/?rtext=${userLocation.lat},${userLocation.lng}~${last[1]},${last[0]}&rtt=auto`;
    void Linking.openURL(url);
  };

  return (
    <View style={styles.panel}>
      <Text style={styles.summary}>{route.summary}</Text>
      <Text style={styles.meta}>
        Всего: {formatDuration(route.totalDurationSeconds)}
      </Text>
      {external ? (
        <Pressable accessibilityRole="button" onPress={openNavigator} style={styles.navBtn}>
          <Text style={styles.navText}>Открыть в навигаторе</Text>
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" onPress={onClear} style={styles.clearBtn}>
        <Text style={styles.clearText}>Скрыть маршрут</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.sm,
  },
  summary: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  navBtn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  navText: {
    ...typography.body,
    color: colors.primary,
  },
  clearBtn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  clearText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
