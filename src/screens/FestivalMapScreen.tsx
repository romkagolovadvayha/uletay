import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FestivalMapView } from '../components/map/FestivalMapView';
import type { FestivalMapApi } from '../components/map/types';
import { MapFabGroup } from '../components/map/MapFabGroup';
import { MapFilterChips } from '../components/map/MapFilterChips';
import { MapLocationBanner } from '../components/map/MapLocationBanner';
import { MapMotionConfig } from '../components/map/MapMotionConfig';
import { MapPoiCard } from '../components/map/MapPoiCard';
import { MapPoiPopup } from '../components/map/MapPoiPopup';
import { MapRoutePanel } from '../components/map/MapRoutePanel';
import { MapZoneCard } from '../components/map/MapZoneCard';
import { useAppData } from '../context/DataContext';
import { useUserLocation } from '../hooks/useUserLocation';
import { RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type {
  CombinedRoute,
  MapFilterId,
  MapPoiProperties,
  MapZoneProperties,
} from '../types/map';
import { allRouteCoordinates, buildCombinedRouteToTarget } from '../utils/map/combinedRoute';
import { isInsideTerritory } from '../utils/map/geo';
import { getActiveZoneTypes } from '../utils/map/layerStyles';
import { zoneTargetPoint } from '../utils/map/zoneGeo';

type Navigation = BottomTabNavigationProp<RootTabParamList, 'MapTab'>;
type PoiFeature = GeoJSON.Feature<GeoJSON.Point, MapPoiProperties>;
type ZoneFeature = GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>;

type Props = {
  navigation: Navigation;
};

export function FestivalMapScreen({ navigation }: Props) {
  const mapRoute = useRoute<RouteProp<RootTabParamList, 'MapTab'>>();
  const { data } = useAppData();
  const mapConfig = data.festivalMap;
  const { location, status, requestPermission } = useUserLocation(Boolean(mapConfig?.enabled));
  const mapApi = useRef<FestivalMapApi | null>(null);

  const [filterChoice, setFilterChoice] = useState<MapFilterId>('all');
  const [followUser, setFollowUser] = useState(false);
  const [pickedZoneId, setPickedZoneId] = useState<string | null>(null);
  const [pickedPoiId, setPickedPoiId] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState<CombinedRoute | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const routePoiId = mapRoute.params?.poiId ?? null;
  const selectedPoiId = routePoiId ?? pickedPoiId;
  const selectedZoneId = routePoiId ? null : pickedZoneId;

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

  const selectedPoi = useMemo(() => {
    if (!selectedPoiId) return null;
    const poi = data.mapPois?.features.find((f) => f.properties.id === selectedPoiId);
    return (poi as PoiFeature | undefined) ?? null;
  }, [selectedPoiId, data.mapPois]);

  const popupVisible = Boolean(selectedZone || selectedPoi || activeRoute);

  const outsideTerritory = useMemo(() => {
    if (!location || !mapConfig) return false;
    return !isInsideTerritory(location, mapConfig);
  }, [location, mapConfig]);

  const dismissPopup = useCallback(() => {
    setPickedZoneId(null);
    setPickedPoiId(null);
    setActiveRoute(null);
    setRouteError(null);
    if (routePoiId) {
      navigation.setParams({ poiId: undefined });
    }
  }, [navigation, routePoiId]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setPickedZoneId(null);
        setPickedPoiId(null);
        setActiveRoute(null);
      };
    }, []),
  );

  const handleMapReady = useCallback((api: FestivalMapApi) => {
    mapApi.current = api;
  }, []);

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
      return;
    }
    if (selectedPoi) {
      const [lng, lat] = selectedPoi.geometry.coordinates;
      mapApi.current?.flyTo(lat, lng, 18);
    }
  }, [selectedZone, selectedPoi]);

  const runRoute = useCallback(
    async (target: { lat: number; lng: number }, targetName: string) => {
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
        });
        if (!combined) {
          setRouteError('Не удалось проложить маршрут — проверьте дороги на карте в админке.');
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
    [location, mapConfig, data.mapPaths, data.mapPois],
  );

  const handleZoneRoute = useCallback(async () => {
    if (!selectedZone) return;
    await runRoute(zoneTargetPoint(selectedZone), selectedZone.properties.name);
  }, [selectedZone, runRoute]);

  const handlePoiRoute = useCallback(async () => {
    if (!selectedPoi) return;
    const [lng, lat] = selectedPoi.geometry.coordinates;
    await runRoute({ lat, lng }, selectedPoi.properties.name);
  }, [selectedPoi, runRoute]);

  const openLinkedScreen = useCallback(() => {
    if (!selectedPoi?.properties.link) return;
    const link = selectedPoi.properties.link;
    if (link.type === 'foodcourt' && link.id) {
      navigation.navigate('MoreTab', {
        screen: 'FoodCourtDetail',
        params: { vendorId: link.id },
      });
    }
    if (link.type === 'stage' && link.id) {
      navigation.navigate('ScheduleTab', {
        screen: 'FullSchedule',
        params: { stageId: link.id as 'ren-tv' | 'south' | 'west' },
      });
    }
  }, [navigation, selectedPoi]);

  if (!mapConfig?.enabled) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.empty}>Карта скоро появится</Text>
      </SafeAreaView>
    );
  }

  return (
    <MapMotionConfig>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.mapWrap}>
          <View style={styles.mapLayer}>
            <FestivalMapView
              config={mapConfig}
              zones={data.mapZones}
              paths={data.mapPaths}
              pois={data.mapPois}
              userLocation={location}
              routeSegments={activeRoute?.segments}
              selectedZoneId={selectedZone?.properties.id}
              selectedPoiId={selectedPoi?.properties.id}
              filter={filter}
              followUser={followUser}
              onZonePress={(zone) => {
                setRouteError(null);
                setActiveRoute(null);
                setPickedPoiId(null);
                setPickedZoneId(zone.properties.id);
              }}
              onPoiPress={(poi) => {
                setRouteError(null);
                setActiveRoute(null);
                setPickedZoneId(null);
                setPickedPoiId(poi.properties.id);
              }}
              onZoneRoute={handleZoneRoute}
              onPoiRoute={handlePoiRoute}
              routing={routing}
              onMapPress={dismissPopup}
              onMapReady={handleMapReady}
            />
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
          ) : null}
          {selectedZone ? (
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
          {selectedPoi ? (
            <MapPoiCard
              poi={selectedPoi}
              userLocation={location}
              outsideTerritory={outsideTerritory}
              festivalCenter={mapConfig.center}
              onRoute={handlePoiRoute}
              onOpenLink={selectedPoi.properties.link ? openLinkedScreen : undefined}
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
});
