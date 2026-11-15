import { ios, webStyle } from '../../theme/ios';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../PrimaryButton';
import { ExternalLink } from '../ExternalLink';
import { colors } from '../../theme/colors';
import { mapColors } from '../../theme/map';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import type { LatLng, MapZoneProperties, UserLocationState } from '../../types/map';
import { formatDistance, haversineMeters, buildYandexRouteUrl } from '../../utils/map/geo';
import { getPoiIconName, getZoneIconName, POI_CATEGORY_LABELS, ZONE_TYPE_LABELS } from '../../utils/map/layerStyles';
import { zonePoiCategory } from '../../utils/map/poiData';
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
  const serviceCategory = Platform.OS === 'web' && zoneType === 'service' ? zonePoiCategory(zone) : null;
  const icon = serviceCategory ? getPoiIconName(serviceCategory) : getZoneIconName(zoneType);
  const typeLabel = serviceCategory ? POI_CATEGORY_LABELS[serviceCategory] : ZONE_TYPE_LABELS[zoneType];

  const target = useMemo(() => zoneTargetPoint(zone), [zone]);

  const distanceM = useMemo(() => {
    if (!userLocation) return null;
    return haversineMeters(userLocation, target);
  }, [target, userLocation]);

  const festivalDistanceM = useMemo(() => {
    if (!userLocation || !festivalCenter) return null;
    return haversineMeters(userLocation, festivalCenter);
  }, [userLocation, festivalCenter]);

  const festivalNavUrl = useMemo(() => {
    if (!festivalCenter) return null;
    return buildYandexRouteUrl(userLocation ?? null, festivalCenter);
  }, [festivalCenter, userLocation]);

  if (zone.properties.accessRestricted) {
    return <View style={styles.card}>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.subtitle}>Служебная зона за сценой. Проход для посетителей закрыт.</Text>
    </View>;
  }

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
          Вы вне площадки — маршрут построим до въезда по дорогам, затем по тропинкам фестиваля.
          {' '}Для этого ваши координаты передаются на сервер приложения и сервису маршрутизации (Яндекс или OSRM).
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
          loading={routing}
          style={styles.primary}
        />
        <Text style={styles.routeHint}>По дорогам и дорожкам площадки</Text>
        {routeError ? <Text style={styles.routeError}>{routeError}</Text> : null}

        {festivalNavUrl ? (
          <ExternalLink href={festivalNavUrl} style={styles.linkBtn}>
            <Text style={styles.linkText}>Только до фестиваля в Яндекс.Навигаторе</Text>
          </ExternalLink>
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
        loading={routing}
        style={styles.primary}
      />
      <Text style={styles.routeHint}>По дорогам и дорожкам площадки</Text>
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
    ...webStyle({ width: 44, height: 44, borderRadius: 22, borderWidth: 0, backgroundColor: 'rgba(255,255,255,.065)' }),
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.text,
    ...webStyle({ fontSize: 20, lineHeight: 26, fontWeight: '600', letterSpacing: -0.3, textTransform: 'none' }),
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,

    ...ios.secondary,
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
    ...webStyle({ borderWidth: 0, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.055)', padding: 14 }),
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
    ...webStyle({ minHeight: 46, paddingVertical: 12 }),
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...webStyle({ backgroundColor: 'transparent', borderWidth: 0, borderRadius: 0, paddingHorizontal: 0, paddingRight: 52, paddingTop: 8, paddingBottom: 8 }),
  },
  categoryText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    ...webStyle({ color: colors.textSecondary, fontSize: 13, lineHeight: 18, fontWeight: '400', textTransform: 'none' }),
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

    ...ios.errorText,
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
