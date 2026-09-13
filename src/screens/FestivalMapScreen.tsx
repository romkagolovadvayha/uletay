import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FestivalMapView } from '../components/map/FestivalMapView';
import { ScreenTitle } from '../components/ScreenTitle';
import { MotionPressable } from '../components/MotionPressable';
import type { FestivalMapApi } from '../components/map/types';
import { MapFabGroup } from '../components/map/MapFabGroup';
import { MapDirectionsButton } from '../components/map/MapDirectionsButton';
import { MapDirectionsSheet } from '../components/map/MapDirectionsSheet';
import { MapFilterChips } from '../components/map/MapFilterChips';
import { MapSearchPanel } from '../components/map/map-search-panel';
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
import { ROAD_ENTRANCE } from '../data/festivalMap';
import { RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { mapColors } from '../theme/map';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type {
  CombinedRoute,
  MapFilterId,
  MapPoiProperties,
  MapZoneProperties,
  UserMapMarkerKind,
} from '../types/map';
import { allRouteCoordinates, buildCombinedRouteToTarget } from '../utils/map/combinedRoute';
import { isInsideTerritory } from '../utils/map/geo';
import { getMapFilters } from '../utils/map/layerStyles';
import { poiCoordinate } from '../utils/map/poiData';
import { zoneTargetPoint } from '../utils/map/zoneGeo';
import type { MapPlaceMarker } from '../utils/map/placeMarkers';
import { zoneImageLayout } from '../utils/map/zoneFillImage';

type Navigation = BottomTabNavigationProp<RootTabParamList, 'MapTab'>;
type ZoneFeature = GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>;
type PoiFeature = GeoJSON.Feature<GeoJSON.Point, MapPoiProperties>;

const AUTOCAMP_NUMBER_GROUPS = [
  { key: 'all', label: 'Все места', start: 1, end: 296 },
  ...Array.from({ length: 12 }, (_, index) => ({
    key: String(index * 20 + 1),
    label: `${index * 20 + 1}–${index * 20 + 20}`,
    start: index * 20 + 1,
    end: index * 20 + 20,
  })),
  { key: '241', label: '241–246', start: 241, end: 246 },
  { key: '247', label: '247–266', start: 247, end: 266 },
  { key: '267', label: '267–296', start: 267, end: 296 },
] as const;

type AutocampNumberGroup = (typeof AUTOCAMP_NUMBER_GROUPS)[number];

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
  const { data, refreshData, isLoading: dataRefreshing, error: dataError } = useAppData();
  const mapConfig = data.festivalMap;
  // The map is useful without precise location. Ask only after the user taps locate.
  const { location, status, requestPermission } = useUserLocation(false);
  const mapApi = useRef<FestivalMapApi | null>(null);
  const handledRouteRequestRef = useRef<string | null>(null);
  const { markers, saveMarker, removeMarker } = useUserMapMarkers();

  const [filterChoice, setFilterChoice] = useState<MapFilterId>('all');
  const [autocampGroupKey, setAutocampGroupKey] = useState('all');
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
  const [mapAttempt, setMapAttempt] = useState(0);
  const [mapErrorDetail, setMapErrorDetail] = useState<string | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const [directionsVisible, setDirectionsVisible] = useState(false);
  const [mapInfoVisible, setMapInfoVisible] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<MapPlaceMarker[]>([]);
  const [savedPlacesVisible, setSavedPlacesVisible] = useState(false);
  const [placingMarkerKind, setPlacingMarkerKind] = useState<UserMapMarkerKind | null>(null);

  const selectedZoneId = pickedZoneId;

  const availableFilters = useMemo(
    () => getMapFilters(data.mapZones, data.mapPois),
    [data.mapZones, data.mapPois],
  );
  const filter = useMemo((): MapFilterId => {
    if (filterChoice === 'all') return 'all';
    return availableFilters.some(item => item.id === filterChoice)
      ? filterChoice
      : 'all';
  }, [filterChoice, availableFilters]);

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

  const festivalArrivalTarget = useMemo(() => {
    const preferred = data.mapPois?.features.find(
      (item) => item.properties.id === 'plan-2026-entry-1',
    ) ?? data.mapPois?.features.find(
      (item) => item.properties.category === 'entrance' && item.properties.status !== 'closed',
    );
    if (!preferred) return ROAD_ENTRANCE;
    const [lng, lat] = preferred.geometry.coordinates;
    return preferred.properties.accessPoint ?? { lat, lng };
  }, [data.mapPois]);

  const mapSelectedZoneId =
    highlightZoneId ?? pickedZoneId ?? selectedPoi?.properties.sourceZoneId ?? null;

  const popupVisible = Boolean(
    nearbyPlaces.length || mapInfoVisible || directionsVisible || savedPlacesVisible || pickedZoneId || pickedPoiId || activeRoute || routing,
  );

  const outsideTerritory = useMemo(() => {
    if (!location || !mapConfig) return false;
    return !isInsideTerritory(location, mapConfig);
  }, [location, mapConfig]);

  const dismissPopup = useCallback(() => {
    setNearbyPlaces([]);
    setMapInfoVisible(false);
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
        setNearbyPlaces([]);
        setMapInfoVisible(false);
        setDirectionsVisible(false);
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
    // Readiness comes from the renderer. A timeout offers a real retry.
    const timer = setTimeout(() => setMapLoadError(true), 30_000);
    return () => clearTimeout(timer);
  }, [mapLoaded, mapLoadError, mapRenderError, mapConfig?.enabled, mapAttempt]);

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
      if (mapApi.current?.showFestival) mapApi.current.showFestival();
      else mapApi.current?.flyTo(mapConfig.center.lat, mapConfig.center.lng, mapConfig.defaultZoom);
    }
  }, [mapConfig]);

  useEffect(() => {
    if (selectedZone) {
      const layout = zoneImageLayout(selectedZone);
      const size = Math.max(layout.widthMeters, layout.heightMeters, 1);
      const scale = 78271.51696 * Math.cos(layout.center.lat * Math.PI / 180);
      const zoom = Math.max(13, Math.min(selectedZone.properties.parentZoneId ? 20 : 18, Math.log2(scale * 240 / size)));
      mapApi.current?.flyTo(layout.center.lat, layout.center.lng, zoom);
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
      } catch {
        setRouteError('Не удалось построить маршрут. Попробуйте ещё раз.');
        if (restoreZoneId) {
          setPickedZoneId(restoreZoneId);
          setHighlightZoneId(null);
        }
      } finally {
        setRouting(false);
      }
    },
    [location, mapConfig, data.mapPaths, data.mapPois, data.mapZones],
  );

  const handleZoneRoute = useCallback(async () => {
    if (!selectedZone) return;

    const zoneId = selectedZone.properties.id;
    setHighlightZoneId(zoneId);
    setPickedZoneId(null);
    await runRoute(zoneTargetPoint(selectedZone), selectedZone.properties.name, zoneId);
  }, [selectedZone, runRoute]);

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

  const focusAutocampGroup = useCallback((group: AutocampNumberGroup) => {
    dismissPopup();
    setAutocampGroupKey(group.key);
    const cells = data.mapZones?.features.filter(zone => zone.properties.parentZoneId === 'plan-2026-autocamp' &&
      (group.key === 'all' || (zone.properties.bookingNumber != null &&
        zone.properties.bookingNumber >= group.start && zone.properties.bookingNumber <= group.end))) ?? [];
    if (!cells.length) return;
    const points = cells.flatMap(zone => zone.geometry.coordinates[0]);
    const lng = (Math.min(...points.map(p => p[0])) + Math.max(...points.map(p => p[0]))) / 2;
    const lat = (Math.min(...points.map(p => p[1])) + Math.max(...points.map(p => p[1]))) / 2;
    setFollowUser(false);
    mapApi.current?.flyTo(lat, lng, group.key === 'all' ? 16.6 : 19);
  }, [data.mapZones, dismissPopup]);

  const handleFilterChange = useCallback(
    (next: MapFilterId) => {
      dismissPopup();
      setFilterChoice(next);
      if (next === 'autocamp') {
        focusAutocampGroup(AUTOCAMP_NUMBER_GROUPS[0]);
      }
    },
    [dismissPopup, focusAutocampGroup],
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
        <ScreenTitle style={styles.mapTitle}>Карта фестиваля</ScreenTitle>
        <Text style={styles.empty}>Карта скоро появится</Text>
      </SafeAreaView>
    );
  }

  const mapUnavailable = mapLoadError || mapRenderError;
  const tracedPlan = data.mapZones?.features.some(zone => zone.properties.id.startsWith('plan-2026-'));

  return (
    <MapMotionConfig>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.mapWrap}>
          <ScreenTitle style={styles.visuallyHiddenTitle}>Карта фестиваля</ScreenTitle>
          <View style={styles.mapLayer}>
            <MapErrorBoundary
              key={mapAttempt}
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
                coordinatePicking={Boolean(placingMarkerKind)}
                onMapInteraction={() => setFollowUser(false)}
                onZonePress={(zone) => {
                  setNearbyPlaces([]);
                  setMapInfoVisible(false);
                  setDirectionsVisible(false);
                  setRouteError(null);
                  setActiveRoute(null);
                  setHighlightZoneId(null);
                  setPickedZoneId(zone.properties.id);
                  setPickedPoiId(null);
                }}
                onPoiPress={(poi) => {
                  setNearbyPlaces([]);
                  setMapInfoVisible(false);
                  setDirectionsVisible(false);
                  setSavedPlacesVisible(false);
                  setRouteError(null);
                  setActiveRoute(null);
                  setPickedZoneId(null);
                  setPickedPoiId(poi.properties.id);
                }}
                onPlacesPress={(places) => { dismissPopup(); setNearbyPlaces(places); }}
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
                <ActivityIndicator
                  size="large"
                  color={colors.primary}
                  accessibilityLabel="Загружаем карту"
                />
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
                <MotionPressable accessibilityRole="button" accessibilityLabel="Повторить загрузку карты"
                  style={styles.mapInfoCategory} onPress={() => {
                    setMapLoaded(false);
                    setMapLoadError(false);
                    setMapRenderError(false);
                    setMapErrorDetail(null);
                    setMapAttempt(value => value + 1);
                  }}>
                  <Text style={styles.mapInfoLabel}>Повторить загрузку</Text>
                </MotionPressable>
              </View>
            ) : null}
          </View>
          <View style={styles.mapOverlay} pointerEvents="box-none">
            <View style={styles.mapToolbar} pointerEvents="box-none">
            <MapSearchPanel
              style={styles.search}
              zones={data.mapZones}
              pois={data.mapPois}
              onSelectZone={(zone) => {
                dismissPopup();
                setFilterChoice('all');
                setPickedZoneId(zone.properties.id);
              }}
              onSelectPoi={(poi) => {
                dismissPopup();
                setFilterChoice('all');
                setPickedPoiId(poi.properties.id);
              }}
            />
            <MapFilterChips
              embedded
              zones={data.mapZones}
              pois={data.mapPois}
              value={filter}
              onChange={handleFilterChange}
            />
            {filter === 'autocamp' ? (
              <View style={styles.autocampNavigation}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.autocampRows} accessibilityLabel="Диапазоны номеров мест автокемпинга">
                  {AUTOCAMP_NUMBER_GROUPS.map(group => (
                    <MotionPressable key={group.key} accessibilityRole="button"
                      accessibilityLabel={group.key === 'all' ? 'Показать все места автокемпинга' : `Показать места ${group.label}`}
                      accessibilityState={{ selected: group.key === autocampGroupKey }} onPress={() => focusAutocampGroup(group)}
                      style={[styles.autocampRow, group.key === autocampGroupKey && styles.autocampRowActive]}>
                      <Text style={[styles.autocampRowText, group.key === autocampGroupKey && styles.autocampRowActiveText]}>{group.label}</Text>
                    </MotionPressable>
                  ))}
                </ScrollView>
                <Text style={styles.autocampHint}>Официальные номера 1–296 · Нажмите на место, чтобы открыть</Text>
              </View>
            ) : null}
            {locationRequested || outsideTerritory ? (
              <MapLocationBanner embedded status={status} outsideTerritory={outsideTerritory} onRequestPermission={requestPermission} />
            ) : null}
            </View>
            {tracedPlan && !popupVisible ? (
              <MotionPressable accessibilityRole="button" accessibilityLabel="О карте и условные обозначения"
                style={styles.mapInfoButton} onPress={() => { dismissPopup(); setMapInfoVisible(true); }}>
                <Ionicons name="information-circle" size={25} color={colors.text} />
              </MotionPressable>
            ) : null}
            {routeError && !selectedZone && !selectedPoi && !routing ? (
              <View style={styles.routeFailure} accessibilityLiveRegion="polite">
                <Text style={styles.mapInfoLabel}>{routeError}</Text>
              </View>
            ) : null}
            {placingMarkerKind ? (
              <View style={styles.placingBanner}>
                <Text style={styles.placingText}>
                  Нажмите на карту, чтобы запомнить {placingMarkerKind === 'car' ? 'машину' : 'палатку'}
                </Text>
                <MotionPressable
                  accessibilityRole="button"
                  accessibilityLabel="Отменить сохранение места"
                  hitSlop={14}
                  onPress={() => setPlacingMarkerKind(null)}
                >
                  <Text style={styles.placingCancel}>Отмена</Text>
                </MotionPressable>
              </View>
            ) : null}
            <MapFabGroup
              onZoomIn={() => mapApi.current?.zoomBy?.(1)}
              onZoomOut={() => mapApi.current?.zoomBy?.(-1)}
              onLocate={handleLocate}
              onFestival={handleFestivalCenter}
              onSavedPlaces={() => {
                setMapInfoVisible(false);
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

        <MapPoiPopup
          visible={popupVisible}
          onClose={dismissPopup}
          showCloseButton={!directionsVisible}
        >
          {nearbyPlaces.length ? (
            <ScrollView style={styles.mapInfoContent}>
              <Text style={[styles.mapErrorTitle, { paddingRight: 44 }]}>Места рядом · {nearbyPlaces.length}</Text>
              {nearbyPlaces.map(place => (
                <MotionPressable key={`${place.kind}:${place.id}`} accessibilityRole="button" accessibilityLabel={place.name}
                  style={styles.nearbyPlace} onPress={() => {
                    dismissPopup();
                    if (place.kind === 'zone') setPickedZoneId(place.id);
                    else setPickedPoiId(place.id);
                  }}>
                  <Text style={[styles.nearbyGlyph, { color: place.color }]}>{place.glyph}</Text>
                  <Text style={styles.nearbyName}>{place.name}</Text>
                </MotionPressable>
              ))}
            </ScrollView>
          ) : mapInfoVisible ? (
            <ScrollView style={styles.mapInfoContent}>
              <Text style={styles.mapInfoTitle}>Места на карте</Text>
              <MotionPressable accessibilityRole="button" accessibilityLabel="Обновить объекты карты" disabled={dataRefreshing}
                style={[styles.mapInfoCategory, styles.mapInfoRefreshButton]} onPress={() => { void refreshData(true); }}>
                <Text style={styles.mapInfoLabel}>{dataRefreshing ? 'Обновляем…' : 'Обновить объекты карты'}</Text>
              </MotionPressable>
              <View style={styles.mapInfoDescriptions}>
                {dataError ? <Text accessibilityRole="alert" style={styles.mapInfoDescription}>{dataError}</Text> : null}
                <Text style={styles.mapInfoDescription}>Объекты нанесены по схеме фестиваля 2026 года. Расположение ориентировочное; схема не подтверждает планировку следующего фестиваля.</Text>
                <Text style={styles.mapInfoDescription}>Зелёный — палатки · песочный — парковки и торговля · оранжевый — «Комфорт» · голубой — вода, душ и туалеты · красный пунктир — забор.</Text>
                <Text style={styles.mapInfoDescription}>Подписи зон размещены внутри их границ. Значок автомобиля с номером обозначает въезд, стрелка в проёме — вход или выход. Небольшой значок с числом открывает список близких сервисов.</Text>
                <Text style={styles.mapInfoDescription}>В автокемпинге нанесены официальные номера 1–296 по схеме выбора билетов 2027 года. Выберите диапазон и нажмите на нужную ячейку; цвет ячейки не показывает актуальную занятость.</Text>
                <Text style={styles.mapInfoDescription}>Нажмите на объект или найдите его по названию. Маршруты учитывают дороги, проходы и ограждения; без геолокации путь начинается от главного входа.</Text>
              </View>
              <View style={styles.mapInfoCategories}>
                {availableFilters.map(item => (
                  <MotionPressable key={item.id} accessibilityRole="button" accessibilityLabel={`Показать: ${item.label}`}
                    style={styles.mapInfoCategory} onPress={() => handleFilterChange(item.id)}>
                    <Text style={styles.mapInfoLabel}>{item.label}</Text>
                  </MotionPressable>
                ))}
              </View>
            </ScrollView>
          ) : directionsVisible ? (
            <MapDirectionsSheet
              center={festivalArrivalTarget}
              location={`${data.festival.locationShort || data.festival.location} · Въезд №1`}
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
  autocampNavigation: { marginHorizontal: 16, borderRadius: 10, backgroundColor: '#202124F2', overflow: 'hidden' },
  autocampRows: { padding: 6, gap: 5 },
  autocampRow: { minHeight: 36, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 6 },
  autocampRowActive: { backgroundColor: colors.primary },
  autocampRowText: { color: '#DDD9CA', fontSize: 12, fontWeight: '600' },
  autocampRowActiveText: { color: '#181818' },
  autocampHint: { color: '#B8B5AA', fontSize: 10, paddingHorizontal: 12, paddingBottom: 8 },
  nearbyPlace: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  nearbyGlyph: { width: 36, textAlign: 'center', fontSize: 13, fontWeight: '700' },
  nearbyName: { ...typography.body, color: colors.text, flex: 1 },
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
  mapToolbar: {
    position: 'absolute', top: spacing.sm, left: 0, right: 0,
    gap: spacing.sm, zIndex: 100,
  },
  search: { marginHorizontal: spacing.screen },
  mapInfoButton: { position:'absolute', left:spacing.screen, bottom:96, width:48, height:48,
    borderRadius:24, backgroundColor:mapColors.fabBg, borderWidth:1, borderColor:mapColors.fabBorder,
    alignItems:'center', justifyContent:'center' },
  mapInfoTitle: { ...typography.screenTitle, color:colors.text, textAlign:'center', marginBottom:spacing.md },
  mapInfoLabel: { ...typography.caption, color:colors.text },
  mapInfoContent: { maxHeight:360 },
  mapInfoRefreshButton: { marginBottom:spacing.lg },
  mapInfoDescriptions: { gap:spacing.md },
  mapInfoDescription: { ...typography.body, color:colors.textSecondary, lineHeight:20 },
  mapInfoCategories: { flexDirection:'row', flexWrap:'wrap', gap:spacing.sm, paddingBottom:spacing.md, marginTop:spacing.xl },
  mapInfoCategory: { minHeight:44, paddingHorizontal:spacing.md, justifyContent:'center', borderRadius:16, backgroundColor:colors.surfaceMuted },
  routeFailure: { position:'absolute', bottom:150, left:spacing.screen, right:80, backgroundColor:colors.surface,
    borderRadius:16, padding:spacing.md },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxxl,
  },
  mapTitle: {
    ...typography.screenTitle,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xxxl,
  },
  visuallyHiddenTitle: {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
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
    top: 124,
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
