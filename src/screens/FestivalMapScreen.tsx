import { useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FestivalMapView } from '../components/map/FestivalMapView';
import type { FestivalMapApi } from '../components/map/types';
import { MapFabGroup } from '../components/map/MapFabGroup';
import { MapFilterChips } from '../components/map/MapFilterChips';
import { MapLocationBanner } from '../components/map/MapLocationBanner';
import { MapMotionConfig } from '../components/map/MapMotionConfig';
import { MapPoiPopup } from '../components/map/MapPoiPopup';
import { MapRoutePanel } from '../components/map/MapRoutePanel';
import { MapZoneCard } from '../components/map/MapZoneCard';
import { useAppData } from '../context/DataContext';
import { useUserLocation } from '../hooks/useUserLocation';
import { RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { CombinedRoute, MapFilterId, MapZoneProperties } from '../types/map';
import { allRouteCoordinates, buildCombinedRouteToTarget } from '../utils/map/combinedRoute';
import { isInsideTerritory } from '../utils/map/geo';
import { getActiveZoneTypes } from '../utils/map/layerStyles';
import { zoneTargetPoint } from '../utils/map/zoneGeo';

type Navigation = BottomTabNavigationProp<RootTabParamList, 'MapTab'>;
type ZoneFeature = GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>;

type MapErrorBoundaryProps = {
  children: React.ReactNode;
  onError: (message?: string) => void;
};

type MapErrorBoundaryState = {
  hasError: boolean;
};

class MapErrorBoundary extends React.Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  state: MapErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error?.message);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

type Props = {
  navigation: Navigation;
};

export function FestivalMapScreen({ navigation: _navigation }: Props) {
  const { data } = useAppData();
  const mapConfig = data.festivalMap;
  const { location, status, requestPermission } = useUserLocation(Boolean(mapConfig?.enabled));
  const mapApi = useRef<FestivalMapApi | null>(null);

  const [filterChoice, setFilterChoice] = useState<MapFilterId>('all');
  const [followUser, setFollowUser] = useState(false);
  const [pickedZoneId, setPickedZoneId] = useState<string | null>(null);
  const [highlightZoneId, setHighlightZoneId] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState<CombinedRoute | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(false);
  const [mapRenderError, setMapRenderError] = useState(false);
  const [mapErrorDetail, setMapErrorDetail] = useState<string | null>(null);

  const selectedZoneId = pickedZoneId;

  const activeZoneTypes = useMemo(
    () => getActiveZoneTypes(data.mapZones?.features ?? []),
    [data.mapZones],
  );
  const filter = useMemo((): MapFilterId => {
    if (filterChoice === 'all') return 'all';
    return activeZoneTypes.includes(filterChoice) ? filterChoice : 'all';
  }, [filterChoice, activeZoneTypes]);

  const selectedZone = useMemo(() => {
    if (!selectedZoneId) return null;
    const zone = data.mapZones?.features.find((f) => f.properties.id === selectedZoneId);
    return (zone as ZoneFeature | undefined) ?? null;
  }, [selectedZoneId, data.mapZones]);

  const mapSelectedZoneId = highlightZoneId ?? pickedZoneId;

  const popupVisible = Boolean(pickedZoneId || activeRoute || routing);

  const outsideTerritory = useMemo(() => {
    if (!location || !mapConfig) return false;
    return !isInsideTerritory(location, mapConfig);
  }, [location, mapConfig]);

  const dismissPopup = useCallback(() => {
    setPickedZoneId(null);
    setHighlightZoneId(null);
    setActiveRoute(null);
    setRouteError(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setPickedZoneId(null);
        setHighlightZoneId(null);
        setActiveRoute(null);
      };
    }, []),
  );

  const handleMapReady = useCallback((api: FestivalMapApi) => {
    mapApi.current = api;
  }, []);

  useEffect(() => {
    if (mapLoaded || mapLoadError || mapRenderError || !mapConfig?.enabled) {
      return undefined;
    }
    // Don't keep the spinner forever if native load events are missed.
    const timer = setTimeout(() => setMapLoaded(true), 8_000);
    return () => clearTimeout(timer);
  }, [mapLoaded, mapLoadError, mapRenderError, mapConfig?.enabled]);

  const handleLocate = useCallback(() => {
    setFollowUser(true);
    if (location) {
      mapApi.current?.flyTo(location.lat, location.lng, 17);
    }
  }, [location]);

  const handleFestivalCenter = useCallback(() => {
    setFollowUser(false);
    if (mapConfig) {
      mapApi.current?.flyTo(mapConfig.center.lat, mapConfig.center.lng, mapConfig.defaultZoom);
    }
  }, [mapConfig]);

  useEffect(() => {
    if (selectedZone) {
      const target = zoneTargetPoint(selectedZone);
      mapApi.current?.flyTo(target.lat, target.lng, 18);
    }
  }, [selectedZone]);

  const runRoute = useCallback(
    async (target: { lat: number; lng: number }, targetName: string, restoreZoneId?: string) => {
      setRouting(true);
      setRouteError(null);
      try {
        const combined = await buildCombinedRouteToTarget({
          userLocation: location,
          target,
          targetName,
          mapConfig,
          mapPaths: data.mapPaths,
          mapPois: data.mapPois,
          mapZones: data.mapZones,
        });
        if (!combined) {
          setRouteError('Не удалось проложить маршрут. Попробуйте ещё раз.');
          if (restoreZoneId) {
            setPickedZoneId(restoreZoneId);
            setHighlightZoneId(null);
          }
          return;
        }
        setActiveRoute(combined);
        mapApi.current?.fitRoute(allRouteCoordinates(combined));
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } finally {
        setRouting(false);
      }
    },
    [location, mapConfig, data.mapPaths, data.mapPois, data.mapZones],
  );

  const handleZoneRoute = useCallback(async () => {
    if (!selectedZone) return;

    if (location && mapConfig && !isInsideTerritory(location, mapConfig)) {
      setRouteError('Вы находитесь не на фестивале');
      return;
    }

    const zoneId = selectedZone.properties.id;
    setHighlightZoneId(zoneId);
    setPickedZoneId(null);
    await runRoute(zoneTargetPoint(selectedZone), selectedZone.properties.name, zoneId);
  }, [selectedZone, runRoute, location, mapConfig]);

  if (!mapConfig?.enabled) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.empty}>Карта скоро появится</Text>
      </SafeAreaView>
    );
  }

  const mapUnavailable = mapLoadError || mapRenderError;

  return (
    <MapMotionConfig>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.mapWrap}>
          <View style={styles.mapLayer}>
            <MapErrorBoundary
              onError={(message) => {
                setMapRenderError(true);
                setMapErrorDetail(message ?? null);
              }}
            >
              <FestivalMapView
                config={mapConfig}
                zones={data.mapZones}
                paths={data.mapPaths}
                userLocation={location}
                routeSegments={activeRoute?.segments}
                selectedZoneId={mapSelectedZoneId}
                filter={filter}
                followUser={followUser}
                onZonePress={(zone) => {
                  setRouteError(null);
                  setActiveRoute(null);
                  setHighlightZoneId(null);
                  setPickedZoneId(zone.properties.id);
                }}
                onZoneRoute={handleZoneRoute}
                routing={routing}
                onMapPress={dismissPopup}
                onMapReady={handleMapReady}
                onMapLoaded={() => {
                  setMapLoaded(true);
                  setMapLoadError(false);
                  setMapErrorDetail(null);
                }}
                onMapLoadError={() => {
                  setMapLoadError(true);
                  setMapErrorDetail(null);
                }}
              />
            </MapErrorBoundary>
            {!mapLoaded && !mapUnavailable ? (
              <View style={styles.mapLoading} pointerEvents="none">
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.mapLoadingText}>Загружаем карту…</Text>
              </View>
            ) : null}
            {mapUnavailable ? (
              <View style={styles.mapError}>
                <Text style={styles.mapErrorTitle}>Карта недоступна</Text>
                <Text style={styles.mapErrorText}>
                  {mapErrorDetail ??
                    'Проверьте подключение к интернету и попробуйте снова.'}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.mapOverlay} pointerEvents="box-none">
            <MapFilterChips zones={data.mapZones} value={filter} onChange={setFilterChoice} />
            <MapLocationBanner
              status={status}
              outsideTerritory={outsideTerritory}
              onRequestPermission={requestPermission}
            />
            <MapFabGroup
              onLocate={handleLocate}
              onFestival={handleFestivalCenter}
              followUser={followUser}
            />
          </View>
        </View>

        <MapPoiPopup visible={popupVisible}>
          {activeRoute ? (
            <MapRoutePanel
              route={activeRoute}
              userLocation={location}
              onClear={dismissPopup}
            />
          ) : routing ? (
            <View style={styles.routingPanel}>
              <Text style={styles.routingText}>Строим маршрут…</Text>
            </View>
          ) : selectedZone ? (
            <MapZoneCard
              zone={selectedZone}
              userLocation={location}
              outsideTerritory={outsideTerritory}
              festivalCenter={mapConfig.center}
              onRoute={handleZoneRoute}
              routing={routing}
              routeError={routeError}
            />
          ) : null}
        </MapPoiPopup>
      </SafeAreaView>
    </MapMotionConfig>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapWrap: {
    flex: 1,
    position: 'relative',
  },
  mapLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    elevation: 10,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxxl,
  },
  mapLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  mapLoadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  mapError: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  mapErrorTitle: {
    ...typography.screenTitle,
    color: colors.text,
    textAlign: 'center',
  },
  mapErrorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  routingPanel: {
    paddingVertical: spacing.sm,
  },
  routingText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
});
