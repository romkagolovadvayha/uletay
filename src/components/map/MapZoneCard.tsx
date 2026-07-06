import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../PrimaryButton';
import { colors } from '../../theme/colors';
import { mapColors } from '../../theme/map';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { LatLng, MapZoneProperties, UserLocationState } from '../../types/map';
import { formatDistance, haversineMeters, openYandexNavigation } from '../../utils/map/geo';
import { getZoneIconName, ZONE_TYPE_LABELS } from '../../utils/map/layerStyles';
import { zoneTargetPoint } from '../../utils/map/zoneGeo';

type Props = {
  zone: GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>;
  userLocation?: UserLocationState | null;
  outsideTerritory?: boolean;
  festivalCenter?: LatLng;
  onRoute: () => void;
  routing?: boolean;
  routeError?: string | null;
};

function walkMinutes(distanceM: number): number {
  return Math.max(1, Math.round(distanceM / 80));
}

export function MapZoneCard({
  zone,
  userLocation,
  outsideTerritory = false,
  festivalCenter,
  onRoute,
  routing,
  routeError,
}: Props) {
  const { name, zoneType, description } = zone.properties;
  const icon = getZoneIconName(zoneType);
  const typeLabel = ZONE_TYPE_LABELS[zoneType];

  const target = useMemo(() => zoneTargetPoint(zone), [zone]);

  const distanceM = useMemo(() => {
    if (!userLocation) return null;
    return haversineMeters(userLocation, target);
  }, [target, userLocation]);

  const festivalDistanceM = useMemo(() => {
    if (!userLocation || !festivalCenter) return null;
    return haversineMeters(userLocation, festivalCenter);
  }, [userLocation, festivalCenter]);

  const handleFestivalRoute = () => {
    if (!festivalCenter) return;
    openYandexNavigation(userLocation ?? null, festivalCenter);
  };

  if (outsideTerritory) {
    return (
      <View style={styles.card}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{typeLabel}</Text>
        </View>

        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Ionicons name={icon} size={22} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{name}</Text>
            {description ? <Text style={styles.subtitle}>{description}</Text> : null}
          </View>
        </View>

        <Text style={styles.territoryNote}>
          Вы находитесь не на фестивале — маршрут по карте можно построить только на площадке.
        </Text>

        {festivalDistanceM != null ? (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{formatDistance(festivalDistanceM)}</Text>
              <Text style={styles.statLabel}>до фестиваля</Text>
            </View>
          </View>
        ) : null}

        <PrimaryButton
          label={routing ? 'Строим маршрут…' : 'Построить маршрут'}
          onPress={onRoute}
          style={styles.primary}
        />
        <Text style={styles.routeHint}>По дорогам и тропинкам площадки</Text>
        {routeError ? <Text style={styles.routeError}>{routeError}</Text> : null}

        {festivalCenter ? (
          <Pressable accessibilityRole="button" onPress={handleFestivalRoute} style={styles.linkBtn}>
            <Text style={styles.linkText}>Только до фестиваля в Яндекс.Навигаторе</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{typeLabel}</Text>
      </View>

      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Ionicons name={icon} size={22} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{name}</Text>
          {description ? <Text style={styles.subtitle}>{description}</Text> : null}
        </View>
      </View>

      {distanceM != null ? (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{walkMinutes(distanceM)} мин</Text>
            <Text style={styles.statLabel}>пешком</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatDistance(distanceM)}</Text>
            <Text style={styles.statLabel}>расстояние</Text>
          </View>
        </View>
      ) : null}

      <PrimaryButton
        label={routing ? 'Строим маршрут…' : 'Построить маршрут'}
        onPress={onRoute}
        style={styles.primary}
      />
      <Text style={styles.routeHint}>По дорогам и тропинкам площадки</Text>
      {routeError ? <Text style={styles.routeError}>{routeError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  statValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  primary: {
    width: '100%',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  routeHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: -spacing.xs,
  },
  routeError: {
    ...typography.caption,
    color: colors.live,
    textAlign: 'center',
  },
  territoryNote: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  linkBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    ...typography.body,
    color: mapColors.routeInternal,
  },
});
