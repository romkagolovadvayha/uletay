import React, { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { DeferredIonicons } from '../DeferredIonicons';
import { MotionPressable } from '../MotionPressable';
import { colors } from '../../theme/colors';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { appFont, typography } from '../../theme/typography';
import type { LatLng } from '../../types/map';
import { openExternalUrl } from '../../utils/openExternalUrl';
import { buildGoogleMapsRouteUrl, buildYandexRouteUrl } from '../../utils/map/geo';

type Props = {
  center: LatLng;
  location: string;
  onClose: () => void;
};

function destination(center: LatLng) {
  return `${center.lat},${center.lng}`;
}

function getWebLocation(): Promise<LatLng | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );
  });
}

function openYandexWebRoute(center: LatLng, origin: LatLng | null) {
  openExternalUrl(buildYandexRouteUrl(origin, center));
}

async function openYandexNavigator(center: LatLng, origin: LatLng | null) {
  if (Platform.OS === 'web') {
    openYandexWebRoute(center, origin);
    return;
  }
  const appUrl = `yandexnavi://build_route_on_map?lat_to=${center.lat}&lon_to=${center.lng}`;
  if (await Linking.canOpenURL(appUrl)) {
    await Linking.openURL(appUrl);
    return;
  }
  openExternalUrl(buildYandexRouteUrl(null, center));
}

function openYandexMaps(center: LatLng, origin: LatLng | null) {
  if (Platform.OS === 'web') {
    openYandexWebRoute(center, origin);
    return;
  }
  openExternalUrl(buildYandexRouteUrl(null, center));
}

function openSystemMaps(center: LatLng, label: string) {
  const point = destination(center);
  if (Platform.OS === 'ios') {
    openExternalUrl(`https://maps.apple.com/?daddr=${point}&dirflg=d`);
    return;
  }
  if (Platform.OS === 'android') {
    openExternalUrl(`geo:${point}?q=${point}(${encodeURIComponent(label)})`);
    return;
  }
  openExternalUrl(buildGoogleMapsRouteUrl(center));
}

function RouteButton({ icon, label, primary, disabled, onPress }: {
  icon: React.ComponentProps<typeof DeferredIonicons>['name'];
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={[styles.routeButton, primary && styles.routeButtonPrimary, disabled && styles.disabled]}
    >
      <DeferredIonicons name={icon} size={20} color={primary ? colors.background : colors.primary} />
      <Text style={[styles.routeButtonText, primary && styles.routeButtonTextPrimary]}>{label}</Text>
    </MotionPressable>
  );
}

export function MapDirectionsSheet({ center, location, onClose }: Props) {
  const [routeOrigin, setRouteOrigin] = useState<LatLng | null | undefined>(
    Platform.OS === 'web' ? undefined : null,
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let active = true;
    void getWebLocation().then((origin) => {
      if (active) setRouteOrigin(origin);
    });
    return () => {
      active = false;
    };
  }, []);

  const locating = routeOrigin === undefined;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Как добраться</Text>
          <Text style={styles.location}>{location}</Text>
        </View>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть"
          onPress={onClose}
          hitSlop={8}
          style={styles.close}
        >
          <DeferredIonicons name="close" size={22} color={colors.textSecondary} />
        </MotionPressable>
      </View>
      <Text style={styles.description}>
        {locating
          ? 'Определяем ваше местоположение…'
          : routeOrigin === null && Platform.OS === 'web'
            ? 'Не удалось определить местоположение. Разрешите доступ к геолокации в браузере.'
            : 'Выберите приложение — оно построит маршрут от вашего текущего местоположения до фестиваля.'}
      </Text>
      <RouteButton icon="navigate" label="Проложить в Яндекс Навигаторе" primary disabled={locating} onPress={() => void openYandexNavigator(center, routeOrigin ?? null)} />
      <View style={styles.secondaryRow}>
        <RouteButton icon="map-outline" label="Яндекс Карты" disabled={locating} onPress={() => openYandexMaps(center, routeOrigin ?? null)} />
        <RouteButton icon="apps-outline" label="Другие карты" onPress={() => openSystemMaps(center, location)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headerCopy: { flex: 1 },
  title: { ...typography.screenTitle, color: colors.text, fontSize: 20, textTransform: 'none' },
  location: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  description: { ...typography.body, color: colors.textSecondary, lineHeight: 20 },
  routeButton: {
    minHeight: 48,
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  routeButtonPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  routeButtonText: { ...appFont('semiBold'), color: colors.text, fontSize: 13, textAlign: 'center' },
  routeButtonTextPrimary: { color: colors.background },
  secondaryRow: { flexDirection: 'row', gap: spacing.sm },
  disabled: { opacity: 0.5 },
});
