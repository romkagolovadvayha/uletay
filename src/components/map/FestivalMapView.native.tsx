import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { resolveMediaUrl } from '../../config/api';
import { YANDEX_MAPS_API_KEY } from '../../config/yandexMaps';
import { useLatestRef } from '../../hooks/useLatestRef';
import type { MapPoiProperties, MapZoneProperties } from '../../types/map';
import { filterPoiFeatures, filterZoneFeatures } from '../../utils/map/layerStyles';
import { overlayToYandexLayoutBounds } from '../../utils/map/overlayGeoref';
import { buildNativeYandexMapHtml } from './nativeYandexMapHtml';
import type { FestivalMapViewProps } from './types';

const MAP_BASE_URL = 'https://uletayapp.ru/';

type BridgeMessage =
  | { type: 'loaded' }
  | { type: 'error'; message?: string }
  | { type: 'zonePress'; zoneId: string }
  | { type: 'poiPress'; poiId: string }
  | { type: 'mapPress'; coordinate?: { lat: number; lng: number } };

export function FestivalMapView({
  config,
  zones,
  pois,
  paths,
  userLocation,
  userMarkers,
  routeSegments,
  selectedZoneId,
  selectedPoiId,
  filter,
  followUser,
  onZonePress,
  onPoiPress,
  onMapPress,
  onMapCoordinatePress,
  onMapReady,
  onMapLoaded,
  onMapLoadError,
}: FestivalMapViewProps) {
  const webRef = useRef<WebView>(null);
  const bridgeReadyRef = useRef(false);
  const onZonePressRef = useLatestRef(onZonePress);
  const onPoiPressRef = useLatestRef(onPoiPress);
  const onMapPressRef = useLatestRef(onMapPress);
  const onMapCoordinatePressRef = useLatestRef(onMapCoordinatePress);
  const zonesRef = useLatestRef(zones);
  const poisRef = useLatestRef(pois);

  const filteredZones = useMemo(
    () => filterZoneFeatures(zones?.features ?? [], filter),
    [zones, filter],
  );
  const filteredPois = useMemo(
    () => filterPoiFeatures(pois?.features ?? [], filter),
    [pois, filter],
  );

  const html = useMemo(() => {
    if (!YANDEX_MAPS_API_KEY) return '';
    return buildNativeYandexMapHtml(
      YANDEX_MAPS_API_KEY,
      config.center,
      config.defaultZoom,
    );
  }, [config.center, config.defaultZoom]);

  const bridgeState = useMemo(() => {
    const overlay = config.adminOverlay;
    const overlayUrl = overlay ? resolveMediaUrl(overlay.imageUrl) : undefined;
    return {
      center: config.center,
      defaultZoom: config.defaultZoom,
      selectedZoneId: selectedZoneId ?? null,
      selectedPoiId: selectedPoiId ?? null,
      followUser,
      userLocation: userLocation
        ? { lat: userLocation.lat, lng: userLocation.lng }
        : null,
      userMarkers: userMarkers ?? [],
      paths: paths ?? null,
      routeSegments: routeSegments ?? [],
      overlay:
        overlay && overlayUrl
          ? {
              url: overlayUrl,
              bounds: overlayToYandexLayoutBounds(overlay),
              opacity: overlay.opacity ?? 0.85,
              rotation: overlay.rotation ?? 0,
            }
          : null,
      zones: filteredZones.map((feature) => ({
        type: 'Feature' as const,
        geometry: feature.geometry,
        properties: {
          ...feature.properties,
          fillImageUrl: resolveMediaUrl(feature.properties.fillImageUrl) ?? null,
        },
      })),
      pois: filteredPois.map((feature) => ({
        type: 'Feature' as const,
        geometry: feature.geometry,
        properties: feature.properties,
      })),
    };
  }, [
    config.adminOverlay,
    config.center,
    config.defaultZoom,
    filteredZones,
    followUser,
    paths,
    filteredPois,
    routeSegments,
    selectedZoneId,
    selectedPoiId,
    userLocation,
    userMarkers,
  ]);

  const inject = (js: string) => {
    webRef.current?.injectJavaScript(`${js}; true;`);
  };

  const pushState = () => {
    if (!bridgeReadyRef.current) return;
    inject(`window.__festApply && window.__festApply(${JSON.stringify(bridgeState)})`);
  };

  useEffect(() => {
    pushState();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- push when bridge state changes
  }, [bridgeState]);

  useEffect(() => {
    onMapReady?.({
      flyTo: (lat, lng, zoom = config.defaultZoom) => {
        inject(
          `window.__festCmd && window.__festCmd(${JSON.stringify({ type: 'flyTo', lat, lng, zoom })})`,
        );
      },
      fitRoute: (coordinates) => {
        inject(
          `window.__festCmd && window.__festCmd(${JSON.stringify({ type: 'fitRoute', coordinates })})`,
        );
      },
    });
  }, [onMapReady, config.defaultZoom]);

  const onMessage = (event: WebViewMessageEvent) => {
    let msg: BridgeMessage;
    try {
      msg = JSON.parse(event.nativeEvent.data) as BridgeMessage;
    } catch {
      return;
    }

    if (msg.type === 'loaded') {
      bridgeReadyRef.current = true;
      pushState();
      onMapLoaded?.();
      return;
    }

    if (msg.type === 'error') {
      console.error('[FestivalMapView.native]', msg.message);
      onMapLoadError?.();
      return;
    }

    if (msg.type === 'zonePress') {
      const zone = zonesRef.current?.features.find((f) => f.properties.id === msg.zoneId) as
        | GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>
        | undefined;
      if (zone) onZonePressRef.current(zone);
      return;
    }

    if (msg.type === 'poiPress') {
      const poi = poisRef.current?.features.find((f) => f.properties.id === msg.poiId) as
        | GeoJSON.Feature<GeoJSON.Point, MapPoiProperties>
        | undefined;
      if (poi) onPoiPressRef.current(poi);
      return;
    }

    if (msg.type === 'mapPress') {
      if (msg.coordinate) {
        onMapCoordinatePressRef.current?.(msg.coordinate);
      } else {
        onMapPressRef.current?.();
      }
    }
  };

  if (!YANDEX_MAPS_API_KEY) {
    return (
      <View style={styles.fill}>
        <Text style={styles.error}>
          Задайте EXPO_PUBLIC_YANDEX_MAPS_API_KEY для отображения карты
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <WebView
        ref={webRef}
        style={styles.fill}
        originWhitelist={['*']}
        source={{ html, baseUrl: MAP_BASE_URL }}
        onMessage={onMessage}
        onError={() => onMapLoadError?.()}
        onHttpError={() => onMapLoadError?.()}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="always"
        // Hardware layer: software rendering skips Yandex raster tiles (tile_manager OOM on emulator).
        androidLayerType="hardware"
        cacheEnabled
        thirdPartyCookiesEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  error: {
    color: '#fff',
    textAlign: 'center',
    padding: 16,
  },
});
