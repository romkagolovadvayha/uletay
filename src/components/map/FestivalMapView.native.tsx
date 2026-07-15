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
import { mapColors, NATIVE_MAP_STYLE_URL, NATIVE_MAP_TEXT_FONT } from '../../theme/map';
import type { MapZoneProperties } from '../../types/map';
import { filterZoneFeatures, MAP_CAMERA_2D } from '../../utils/map/layerStyles';
import { overlayToImageCoordinates } from '../../utils/map/overlayGeoref';
import { shouldShowZoneLabel, zoneLabelText } from '../../utils/map/zoneDisplay';
import { zoneFillImageRotation, zoneLabelRotation, ZONE_LABEL_MIN_ZOOM } from '../../utils/map/zoneDecor';
import { zoneFillImageCoordinates, zoneImageLayout } from '../../utils/map/zoneFillImage';
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
  onMapLoaded,
  onMapLoadError,
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

  const zoneLabelsGeoJson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: filteredZones
        .filter((feature) => shouldShowZoneLabel(feature.properties))
        .map((feature) => {
          const layout = zoneImageLayout(feature);
          return {
            type: 'Feature' as const,
            properties: {
              label: zoneLabelText(feature.properties),
              heightMeters: layout.heightMeters,
              widthMeters: layout.widthMeters,
              labelRotation: zoneLabelRotation(feature.properties, layout),
            },
            geometry: {
              type: 'Point' as const,
              coordinates: [layout.center.lng, layout.center.lat] as [number, number],
            },
          };
        }),
    }),
    [filteredZones],
  );

  const zoneFillImages = useMemo(
    () =>
      filteredZones
        .map((feature) => {
          const imageUrl = resolveMediaUrl(feature.properties.fillImageUrl);
          if (!imageUrl) return null;
          const layout = zoneImageLayout(feature);
          return {
            id: feature.properties.id,
            url: imageUrl,
            coordinates: zoneFillImageCoordinates(layout, zoneFillImageRotation(feature.properties, layout)),
            opacity: feature.properties.fillImageOpacity ?? 0.92,
          };
        })
        .filter(Boolean) as {
        id: string;
        url: string;
        coordinates: [[number, number], [number, number], [number, number], [number, number]];
        opacity: number;
      }[],
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

  const markLoaded = () => onMapLoaded?.();

  return (
    <View style={styles.fill}>
      <Map
        style={styles.fill}
        androidView="texture"
        mapStyle={NATIVE_MAP_STYLE_URL}
        onDidFinishLoadingStyle={markLoaded}
        onDidFinishLoadingMap={markLoaded}
        onDidFailLoadingMap={() => onMapLoadError?.()}
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
        {zoneFillImages.map((item) => (
          <ImageSource
            key={`zone-fill-${item.id}`}
            id={`zone-fill-${item.id}`}
            url={item.url}
            coordinates={item.coordinates}
          >
            <Layer
              id={`zone-fill-layer-${item.id}`}
              type="raster"
              paint={{ 'raster-opacity': item.opacity }}
            />
          </ImageSource>
        ))}
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
        {zoneLabelsGeoJson.features.length > 0 ? (
          <GeoJSONSource id="zone-labels" data={zoneLabelsGeoJson as GeoJSON.GeoJSON}>
            <Layer
              id="zone-labels-text"
              type="symbol"
              minzoom={ZONE_LABEL_MIN_ZOOM}
              layout={{
                'text-field': ['get', 'label'],
                'text-font': [...NATIVE_MAP_TEXT_FONT],
                'text-size': [
                  'interpolate',
                  ['exponential', 2],
                  ['zoom'],
                  ZONE_LABEL_MIN_ZOOM,
                  0,
                  ZONE_LABEL_MIN_ZOOM + 0.5,
                  ['*', 0.18, ['get', 'heightMeters']],
                  16,
                  ['*', 0.5, ['get', 'heightMeters']],
                  18,
                  ['*', 1.0, ['get', 'heightMeters']],
                  20,
                  ['*', 2.0, ['get', 'heightMeters']],
                ],
                'text-rotate': ['get', 'labelRotation'],
                'text-anchor': 'center',
                'text-max-width': ['*', 0.85, ['get', 'widthMeters']],
                'text-allow-overlap': true,
                'text-ignore-placement': true,
              }}
              paint={{
                'text-color': '#ffffff',
                'text-halo-color': 'rgba(0,0,0,0.75)',
                'text-halo-width': 1.5,
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
