import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FestivalMapView } from '../components/map/FestivalMapView';
import type { FestivalMapApi } from '../components/map/types';
import { MapFabGroup } from '../components/map/MapFabGroup';
import { MapDirectionsButton } from '../components/map/MapDirectionsButton';
import { MapDirectionsSheet } from '../components/map/MapDirectionsSheet';
import { MapFilterChips } from '../components/map/MapFilterChips';
import { MapLocationBanner } from '../components/map/MapLocationBanner';
import { MapMotionConfig } from '../components/map/MapMotionConfig';
import { MapPoiPopup } from '../components/map/MapPoiPopup';
import { MapPoiCard } from '../components/map/MapPoiCard';
import { MapRoutePanel } from '../components/map/MapRoutePanel';
import { MapSavedPlacesPanel } from '../components/map/MapSavedPlacesPanel';
import { MapZoneCard } from '../components/map/MapZoneCard';
import { useAppData } from '../context/DataContext';
import { useUserLocation } from '../hooks/useUserLocation';
import { useUserMapMarkers } from '../hooks/useUserMapMarkers';
import { RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type {
  CombinedRoute,
  MapFilterId,
  MapPoiProperties,
  MapPoiCategory,
  MapZoneProperties,
  UserMapMarkerKind,
} from '../types/map';
import { allRouteCoordinates, buildCombinedRouteToTarget } from '../utils/map/combinedRoute';
import { isInsideTerritory } from '../utils/map/geo';
import { getActivePoiCategories } from '../utils/map/layerStyles';
import { nearestPois, poiCoordinate } from '../utils/map/poiData';
import { zoneTargetPoint } from '../utils/map/zoneGeo';

type Navigation = BottomTabNavigationProp<RootTabParamList, 'MapTab'>;
type ZoneFeature = GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>;
type PoiFeature = GeoJSON.Feature<GeoJSON.Point, MapPoiProperties>;

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
  route: RouteProp<RootTabParamList, 'MapTab'>;
};

export function FestivalMapScreen({ route }: Props) {
  const { data } = useAppData();
  const mapConfig = data.festivalMap;
  // The map is useful without precise location. Ask only after the user taps locate.
  const { location, status, requestPermission } = useUserLocation(false);
  const mapApi = useRef<FestivalMapApi | null>(null);
  const handledRouteRequestRef = useRef<string | null>(null);
  const { markers, saveMarker, removeMarker } = useUserMapMarkers();

  const [filterChoice, setFilterChoice] = useState<MapFilterId>('all');
  const [followUser, setFollowUser] = useState(false);
  const [pickedZoneId, setPickedZoneId] = useState<string | null>(null);
  const [pickedPoiId, setPickedPoiId] = useState<string | null>(null);
  const [highlightZoneId, setHighlightZoneId] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState<CombinedRoute | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapLoadError, setMapLoadError] = useState(false);
  const [mapRenderError, setMapRenderError] = useState(false);
  const [mapErrorDetail, setMapErrorDetail] = useState<string | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const [directionsVisible, setDirectionsVisible] = useState(false);
  const [savedPlacesVisible, setSavedPlacesVisible] = useState(false);
  const [placingMarkerKind, setPlacingMarkerKind] = useState<UserMapMarkerKind | null>(null);

  const selectedZoneId = pickedZoneId;

  const activePoiCategories = useMemo(
    () => getActivePoiCategories(data.mapPois?.features ?? []),
    [data.mapPois],
  );
  const filter = useMemo((): MapFilterId => {
    if (filterChoice === 'all') return 'all';
    return activePoiCategories.includes(filterChoice as MapPoiCategory)
      ? (filterChoice as MapPoiCategory)
      : 'all';
  }, [filterChoice, activePoiCategories]);

  const selectedZone = useMemo(() => {
    if (!selectedZoneId) return null;
    const zone = data.mapZones?.features.find((f) => f.properties.id === selectedZoneId);
    return (zone as ZoneFeature | undefined) ?? null;
  }, [selectedZoneId, data.mapZones]);

  const selectedPoi = useMemo(() => {
    if (!pickedPoiId) return null;
    return (data.mapPois?.features.find((item) => item.properties.id === pickedPoiId) as
      | PoiFeature
      | undefined) ?? null;
  }, [data.mapPois, pickedPoiId]);

  const mapSelectedZoneId = highlightZoneId ?? pickedZoneId;

  const popupVisible = Boolean(
    directionsVisible || savedPlacesVisible || pickedZoneId || pickedPoiId || activeRoute || routing,
  );

  const outsideTerritory = useMemo(() => {
    if (!location || !mapConfig) return false;
    return !isInsideTerritory(location, mapConfig);
  }, [location, mapConfig]);

  const dismissPopup = useCallback(() => {
    setDirectionsVisible(false);
    setPickedZoneId(null);
    setPickedPoiId(null);
    setHighlightZoneId(null);
    setActiveRoute(null);
    setSavedPlacesVisible(false);
    setRouteError(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setPickedZoneId(null);
        setPickedPoiId(null);
        setHighlightZoneId(null);
        setActiveRoute(null);
        setSavedPlacesVisible(false);
        setPlacingMarkerKind(null);
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

  const handleLocate = useCallback(async () => {
    setFollowUser(true);
    setLocationRequested(true);
    if (location) {
      mapApi.current?.flyTo(location.lat, location.lng, 17);
      return;
    }
    await requestPermission();
  }, [location, requestPermission]);

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

  useEffect(() => {
    if (!selectedPoi) return;
    const target = poiCoordinate(selectedPoi);
    mapApi.current?.flyTo(target.lat, target.lng, 18);
  }, [selectedPoi]);

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
          setRouteError('Нет связного маршрута по дорожкам. Сообщите организатору — участок карты требует исправления.');
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

  const handlePoiRoute = useCallback(async () => {
    if (!selectedPoi) return;
    const target = selectedPoi.properties.accessPoint ?? poiCoordinate(selectedPoi);
    await runRoute(target, selectedPoi.properties.name);
  }, [runRoute, selectedPoi]);

  useEffect(() => {
    const poiId = route.params?.poiId;
    if (!poiId || !data.mapPois?.features.some((item) => item.properties.id === poiId)) return;
    const requestKey = `${poiId}:${route.params?.routeTo ? 'route' : 'show'}`;
    if (handledRouteRequestRef.current === requestKey) return;
    handledRouteRequestRef.current = requestKey;
    const timer = setTimeout(() => {
      setPickedZoneId(null);
      setPickedPoiId(poiId);
      if (route.params?.routeTo) {
        const poi = data.mapPois?.features.find((item) => item.properties.id === poiId);
        if (poi) void runRoute(poi.properties.accessPoint ?? poiCoordinate(poi), poi.properties.name);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [data.mapPois, route.params?.poiId, route.params?.routeTo, runRoute]);

  const handleFilterChange = useCallback(
    (next: MapFilterId) => {
      setFilterChoice(next);
      setActiveRoute(null);
      setPickedZoneId(null);
      if (next === 'all') {
        setPickedPoiId(null);
        return;
      }
      const origin = location ?? mapConfig?.center;
      const candidates =
        origin && activePoiCategories.includes(next as MapPoiCategory)
          ? nearestPois(data.mapPois, next as MapPoiCategory, origin, 3)
          : [];
      const first = candidates[0];
      if (first) setPickedPoiId(first.properties.id);
    },
    [activePoiCategories, data.mapPois, location, mapConfig?.center],
  );

  const saveAtCurrentLocation = useCallback(
    (kind: UserMapMarkerKind) => {
      if (!location) return;
      saveMarker(kind, location, location.accuracy);
    },
    [location, saveMarker],
  );

  const placeMarkerOnMap = useCallback((kind: UserMapMarkerKind) => {
    setSavedPlacesVisible(false);
    setPlacingMarkerKind(kind);
    setPickedPoiId(null);
    setPickedZoneId(null);
  }, []);

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
                pois={data.mapPois}
                paths={data.mapPaths}
                userLocation={location}
                userMarkers={markers}
                routeSegments={activeRoute?.segments}
                selectedZoneId={mapSelectedZoneId}
                selectedPoiId={pickedPoiId}
                filter={filter}
                followUser={followUser}
                onZonePress={(zone) => {
                  setDirectionsVisible(false);
                  setRouteError(null);
                  setActiveRoute(null);
                  setHighlightZoneId(null);
                  setPickedZoneId(zone.properties.id);
                  setPickedPoiId(null);
                }}
                onPoiPress={(poi) => {
                  setDirectionsVisible(false);
                  setSavedPlacesVisible(false);
                  setRouteError(null);
                  setActiveRoute(null);
                  setPickedZoneId(null);
                  setPickedPoiId(poi.properties.id);
                }}
                onZoneRoute={handleZoneRoute}
                routing={routing}
                onMapPress={dismissPopup}
                onMapCoordinatePress={(coordinate) => {
                  if (placingMarkerKind) {
                    saveMarker(placingMarkerKind, coordinate);
                    setPlacingMarkerKind(null);
                    setSavedPlacesVisible(true);
                    return;
                  }
                  dismissPopup();
                }}
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
            <MapFilterChips
              zones={data.mapZones}
              pois={data.mapPois}
              value={filter}
              onChange={handleFilterChange}
            />
            {placingMarkerKind ? (
              <View style={styles.placingBanner}>
                <Text style={styles.placingText}>
                  Нажмите на карту, чтобы запомнить {placingMarkerKind === 'car' ? 'машину' : 'палатку'}
                </Text>
                <Text onPress={() => setPlacingMarkerKind(null)} style={styles.placingCancel}>Отмена</Text>
              </View>
            ) : null}
            {locationRequested || outsideTerritory ? (
              <MapLocationBanner
                status={status}
                outsideTerritory={outsideTerritory}
                onRequestPermission={requestPermission}
              />
            ) : null}
            <MapFabGroup
              onLocate={handleLocate}
              onFestival={handleFestivalCenter}
              onSavedPlaces={() => {
                setDirectionsVisible(false);
                setPickedPoiId(null);
                setPickedZoneId(null);
                setActiveRoute(null);
                setSavedPlacesVisible(true);
              }}
              followUser={followUser}
            />
            {!popupVisible ? (
              <MapDirectionsButton
                onPress={() => {
                  setPickedZoneId(null);
                  setActiveRoute(null);
                  setRouteError(null);
                  setDirectionsVisible(true);
                }}
              />
            ) : null}
          </View>
        </View>

        <MapPoiPopup visible={popupVisible}>
          {directionsVisible ? (
            <MapDirectionsSheet
              center={mapConfig.center}
              location={data.festival.locationShort || data.festival.location}
              onClose={dismissPopup}
            />
          ) : savedPlacesVisible ? (
            <MapSavedPlacesPanel
              markers={markers}
              userLocation={location}
              onSaveHere={saveAtCurrentLocation}
              onPlaceOnMap={placeMarkerOnMap}
              onRoute={(marker) => {
                setSavedPlacesVisible(false);
                void runRoute(
                  marker.coordinate,
                  marker.kind === 'car' ? 'Моя машина' : 'Моя палатка',
                );
              }}
              onRemove={removeMarker}
              onClose={dismissPopup}
            />
          ) : activeRoute ? (
            <MapRoutePanel
              route={activeRoute}
              userLocation={location}
              onClear={dismissPopup}
            />
          ) : routing ? (
            <View style={styles.routingPanel}>
              <Text style={styles.routingText}>Строим маршрут…</Text>
            </View>
          ) : selectedPoi ? (
            <MapPoiCard
              poi={selectedPoi}
              userLocation={location}
              outsideTerritory={outsideTerritory}
              festivalCenter={mapConfig.center}
              onRoute={handlePoiRoute}
              routing={routing}
              routeError={routeError}
            />
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
  placingBanner: {
    position: 'absolute',
    top: 64,
    left: spacing.screen,
    right: spacing.screen,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  placingText: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
  },
  placingCancel: {
    ...typography.button,
    color: colors.primary,
  },
});
