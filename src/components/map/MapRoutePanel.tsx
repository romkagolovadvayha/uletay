import { ios, webStyle } from '../../theme/ios';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CombinedRoute, LatLng } from '../../types/map';
import { ExternalLink } from '../ExternalLink';
import { MotionPressable } from '../MotionPressable';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatDistance, formatDuration, buildYandexRouteUrl } from '../../utils/map/geo';

type Props = {
  route: CombinedRoute;
  userLocation: LatLng | null;
  onClear: () => void;
};

export function MapRoutePanel({ route, userLocation, onClear }: Props) {
  const external = route.segments.find((s) => s.kind === 'external');
  const arrival = route.arrivalPoint ?? (external?.coordinates.length ? {
    lat: external.coordinates[external.coordinates.length - 1][1],
    lng: external.coordinates[external.coordinates.length - 1][0],
  } : null);
  const navigatorUrl =
    userLocation && arrival
      ? buildYandexRouteUrl(userLocation, arrival)
      : null;

  return (
    <View style={styles.panel}>
      <Text style={styles.summary}>{route.summary}</Text>
      {route.roadRouteUnavailable ? (
        <Text style={styles.meta} accessibilityLiveRegion="polite">Автомаршрут сейчас недоступен. Показан пеший путь от входа. До фестиваля можно доехать по навигатору.</Text>
      ) : null}
      <Text style={styles.meta}>
        {formatDistance(route.totalDistanceMeters)} · {formatDuration(route.totalDurationSeconds)}
      </Text>
      {navigatorUrl ? (
        <ExternalLink href={navigatorUrl} style={styles.navBtn}>
          <Text style={styles.navText}>Открыть в навигаторе</Text>
        </ExternalLink>
      ) : null}
      <MotionPressable accessibilityRole="button" onPress={onClear} style={styles.clearBtn}>
        <Text style={styles.clearText}>Скрыть маршрут</Text>
      </MotionPressable>
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
    paddingRight: 44,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
    ...ios.secondary,
  },
  navBtn: {
    minHeight: 44,
    justifyContent: 'center',
    ...ios.button, ...webStyle({ backgroundColor: colors.primary, alignItems: 'center' }),
  },
  navText: {
    ...typography.body,
    color: colors.primary,
    ...webStyle({ color: colors.primaryText }),
  },
  clearBtn: {
    minHeight: 44,
    justifyContent: 'center',
    ...ios.button, ...webStyle({ backgroundColor: colors.surfaceElevated, alignItems: 'center' }),
  },
  clearText: {
    ...typography.caption,
    color: colors.textMuted,
    ...webStyle({ color: colors.text, fontSize: 15, lineHeight: 20 }),
  },
});
