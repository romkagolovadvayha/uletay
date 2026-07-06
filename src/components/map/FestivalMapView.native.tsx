import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  ImageSource,
  Layer,
  Map,
} from '@maplibre/maplibre-react-native';
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLatestRef } from '../../hooks/useLatestRef';
import { resolveMediaUrl } from '../../config/api';
import { mapColors } from '../../theme/map';
import type { MapZoneProperties } from '../../types/map';
import { filterZoneFeatures, MAP_CAMERA_2D } from '../../utils/map/layerStyles';
import { overlayToImageCoordinates } from '../../utils/map/overlayGeoref';
import type { FestivalMapViewProps } from './types';

export function FestivalMapView({
  config,
  zones,
  paths,
  userLocation,
  routeSegments,
  selectedZoneId,
  filter,
  followUser,
  onZonePress,
  onMapPress,
  onMapReady,
}: FestivalMapViewProps) {
  const cameraRef = useRef<CameraRef>(null);
  const onMapPressRef = useLatestRef(onMapPress);

  const filteredZones = useMemo(
    () => filterZoneFeatures(zones?.features ?? [], filter),
    [zones, filter],
  );

  const zonesGeoJson = useMemo(
    () => ({ type: 'FeatureCollection' as const, features: filteredZones }),
    [filteredZones],
  );

  const pitch = MAP_CAMERA_2D.pitch;

  const overlay = config.adminOverlay;
  const overlayUrl = overlay ? resolveMediaUrl(overlay.imageUrl) : undefined;
  const overlayCoords = overlay ? overlayToImageCoordinates(overlay) : null;

  useEffect(() => {
    onMapReady?.({
      flyTo: (lat, lng, zoom = config.defaultZoom) => {
        cameraRef.current?.flyTo({
          center: [lng, lat],
          zoom,
          pitch,
          duration: 800,
        });
      },
      fitRoute: (coordinates) => {
        if (!coordinates.length) return;
        let minLng = coordinates[0][0];
        let maxLng = coordinates[0][0];
        let minLat = coordinates[0][1];
        let maxLat = coordinates[0][1];
        for (const [lng, lat] of coordinates) {
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        }
        cameraRef.current?.fitBounds([minLng, minLat, maxLng, maxLat], {
          padding: { top: 40, right: 40, bottom: 40, left: 40 },
          duration: 800,
        });
      },
    });
  }, [onMapReady, config.defaultZoom, pitch]);

  useEffect(() => {
    if (followUser && userLocation) {
      cameraRef.current?.easeTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 17,
        pitch,
        duration: 600,
      });
    }
  }, [followUser, userLocation, pitch]);

  return (
    <View style={styles.fill}>
      <Map
        style={styles.fill}
        mapStyle="https://demotiles.maplibre.org/style.json"
        onPress={(e) => {
          const features = 'features' in e.nativeEvent ? e.nativeEvent.features : undefined;
          if (features?.length) return;
          onMapPressRef.current?.();
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [config.center.lng, config.center.lat],
            zoom: config.defaultZoom,
            pitch,
          }}
        />
        {paths ? (
          <GeoJSONSource id="paths" data={paths as GeoJSON.GeoJSON}>
            <Layer id="paths-line" type="line" paint={{ 'line-color': '#2C2C2E', 'line-width': 4 }} />
          </GeoJSONSource>
        ) : null}
        {overlayUrl && overlayCoords ? (
          <ImageSource id="scheme" url={overlayUrl} coordinates={overlayCoords}>
            <Layer
              id="scheme-layer"
              type="raster"
              paint={{ 'raster-opacity': overlay?.opacity ?? 0.85 }}
            />
          </ImageSource>
        ) : null}
        {zonesGeoJson.features.length > 0 ? (
          <GeoJSONSource
            id="zones"
            data={zonesGeoJson as GeoJSON.GeoJSON}
            onPress={(e) => {
              e.stopPropagation();
              const feature = e.nativeEvent.features?.[0] as
                | GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>
                | undefined;
              if (feature) onZonePress(feature);
            }}
          >
            <Layer
              id="zones-fill"
              type="fill"
              paint={{
                'fill-color': ['get', 'fillColor'],
                'fill-opacity': [
                  'case',
                  ['==', ['get', 'id'], selectedZoneId ?? ''],
                  ['min', ['+', ['get', 'fillOpacity'], 0.18], 0.95],
                  ['get', 'fillOpacity'],
                ],
                'fill-outline-color': [
                  'case',
                  ['==', ['get', 'id'], selectedZoneId ?? ''],
                  '#FFC107',
                  ['coalesce', ['get', 'strokeColor'], '#FFFFFF'],
                ],
              }}
            />
            <Layer
              id="zones-line"
              type="line"
              paint={{
                'line-color': [
                  'case',
                  ['==', ['get', 'id'], selectedZoneId ?? ''],
                  '#FFC107',
                  ['coalesce', ['get', 'strokeColor'], '#FFFFFF'],
                ],
                'line-width': [
                  'case',
                  ['==', ['get', 'id'], selectedZoneId ?? ''],
                  3,
                  ['coalesce', ['get', 'strokeWidth'], 1],
                ],
              }}
            />
          </GeoJSONSource>
        ) : null}
        {routeSegments?.map((seg, index) => (
          <GeoJSONSource
            key={`route-${index}`}
            id={`route-${index}`}
            data={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: seg.coordinates },
            }}
          >
            <Layer
              id={`route-line-${index}`}
              type="line"
              paint={{
                'line-color':
                  seg.kind === 'external' ? mapColors.routeExternal : mapColors.routeInternal,
                'line-width': seg.kind === 'external' ? 4 : 6,
                'line-dasharray': seg.kind === 'external' ? [2, 2] : [1, 0],
              }}
            />
          </GeoJSONSource>
        ))}
        {userLocation ? (
          <GeoJSONSource
            id="user-location"
            data={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Point',
                coordinates: [userLocation.lng, userLocation.lat],
              },
            }}
          >
            <Layer
              id="user-dot"
              type="circle"
              paint={{
                'circle-radius': 8,
                'circle-color': mapColors.userDot,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#FFFFFF',
              }}
            />
          </GeoJSONSource>
        ) : null}
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
