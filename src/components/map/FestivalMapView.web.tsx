import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { FestivalMapViewProps } from './types';
import { resolveMediaUrl } from '../../config/api';
import { YANDEX_MAPS_API_KEY } from '../../config/yandexMaps';
import { mapColors } from '../../theme/map';
import type { MapPoiProperties, MapZoneProperties } from '../../types/map';
import { filterZoneFeatures, POI_CATEGORY_LABELS } from '../../utils/map/layerStyles';
import { pathFeatureStyle, zoneFeatureStyle } from '../../utils/map/featureStyles';
import { overlayToYandexLayoutBounds } from '../../utils/map/overlayGeoref';
import { loadYandexMaps } from '../../utils/map/yandexMapsLoader';
import { useLatestRef } from '../../hooks/useLatestRef';

const STYLE_ID = 'fest-yandex-map-styles';

function ensureMapStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .fest-yandex-map { width: 100%; height: 100%; }
    .fest-scheme-overlay {
      opacity: var(--fest-scheme-opacity, 0.85);
      transform: rotate(var(--fest-scheme-rotation, 0deg));
      transform-origin: center center;
      pointer-events: none;
      z-index: 1;
    }
    .fest-poi-marker {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #ffc107;
      border: 2px solid #000;
      box-sizing: border-box;
      cursor: pointer;
      transform: translate(-50%, -50%);
      position: relative;
      z-index: 2;
    }
    .fest-poi-marker.selected {
      width: 18px;
      height: 18px;
    }
    .fest-poi-callout {
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -50%);
      pointer-events: auto;
      z-index: 3000;
    }
    .fest-poi-callout-body {
      min-width: 160px;
      max-width: 220px;
      margin-bottom: 8px;
      background: rgba(28, 28, 30, 0.96);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .fest-poi-callout-category {
      font-size: 11px;
      font-weight: 600;
      color: #ffc107;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .fest-poi-callout-name {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      line-height: 1.3;
    }
    .fest-poi-callout-btn {
      margin-top: 2px;
      border: none;
      border-radius: 8px;
      background: #ffc107;
      color: #000;
      font-size: 13px;
      font-weight: 600;
      padding: 8px 10px;
      cursor: pointer;
    }
    .fest-poi-callout-btn:disabled {
      opacity: 0.7;
      cursor: wait;
    }
    .fest-poi-callout-tail {
      position: absolute;
      left: 50%;
      bottom: 22px;
      width: 12px;
      height: 12px;
      background: rgba(28, 28, 30, 0.96);
      border-right: 1px solid rgba(255, 255, 255, 0.12);
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      transform: translateX(-50%) rotate(45deg);
      pointer-events: none;
    }
    .fest-poi-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #ffc107;
      border: 2px solid #000;
      box-sizing: border-box;
      flex-shrink: 0;
    }
    .fest-user-marker {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: ${mapColors.userDot};
      border: 2px solid #fff;
      box-sizing: border-box;
      transform: translate(-50%, -50%);
    }
  `;
  document.head.appendChild(style);
}

function getContainerElement(ref: React.RefObject<View | null>): HTMLElement | null {
  const node = ref.current as unknown as HTMLElement | null;
  if (!node?.nodeType) return null;
  node.classList.add('fest-yandex-map');
  return node;
}

const FEST_PATH_SOURCE = 'fest-paths';
const FEST_ROUTE_SOURCE = 'fest-routes';
const FEST_ZONE_SOURCE = 'fest-zones';
const FEST_MARKER_SOURCE = 'fest-markers';

const LAYER_Z = {
  paths: 1400,
  overlay: 2000,
  routes: 3400,
  zones: 3600,
  markers: 3800,
} as const;

function setupFestivalMapLayers(map: YandexMapInstance, ymaps3: YandexMapsModule) {
  const { YMapFeatureDataSource, YMapLayer } = ymaps3;

  const stacks: { id: string; zIndex: number; type: 'features' | 'markers' }[] = [
    { id: FEST_PATH_SOURCE, zIndex: LAYER_Z.paths, type: 'features' },
    { id: FEST_ROUTE_SOURCE, zIndex: LAYER_Z.routes, type: 'features' },
    { id: FEST_ZONE_SOURCE, zIndex: LAYER_Z.zones, type: 'features' },
    { id: FEST_MARKER_SOURCE, zIndex: LAYER_Z.markers, type: 'markers' },
  ];

  for (const stack of stacks) {
    map.addChild(new YMapFeatureDataSource({ id: stack.id }));
    map.addChild(
      new YMapLayer({
        source: stack.id,
        type: stack.type,
        zIndex: stack.zIndex,
      }),
    );
  }
}

function removeAll(map: YandexMapInstance, items: YandexMapEntity[]) {
  for (const item of items) {
    try {
      map.removeChild(item);
    } catch {
      // Map may already be tearing down.
    }
  }
  items.length = 0;
}

function createSchemeOverlay(
  YMapImageOverlay: new (props: Record<string, unknown>) => YandexMapEntity,
  params: { bounds: YandexLngLatBounds; imageUrl: string; className: string },
) {
  return new YMapImageOverlay({
    ...params,
    zIndex: LAYER_Z.overlay,
  });
}

function createPoiMarkerElement(
  feature: GeoJSON.Feature<GeoJSON.Point, MapPoiProperties>,
  selected: boolean,
  onRoute: () => void,
  routing: boolean,
): HTMLElement {
  if (!selected) {
    const dot = document.createElement('div');
    dot.className = 'fest-poi-marker';
    return dot;
  }

  const wrap = document.createElement('div');
  wrap.className = 'fest-poi-callout';
  wrap.style.position = 'relative';
  wrap.addEventListener('click', (e) => e.stopPropagation());

  const body = document.createElement('div');
  body.className = 'fest-poi-callout-body';

  const category = document.createElement('div');
  category.className = 'fest-poi-callout-category';
  category.textContent = POI_CATEGORY_LABELS[feature.properties.category] ?? feature.properties.category;

  const name = document.createElement('div');
  name.className = 'fest-poi-callout-name';
  name.textContent = feature.properties.name;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fest-poi-callout-btn';
  btn.textContent = routing ? 'Строим маршрут…' : 'Построить маршрут';
  btn.disabled = routing;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    onRoute();
  });

  body.append(category, name, btn);
  const tail = document.createElement('div');
  tail.className = 'fest-poi-callout-tail';
  const dot = document.createElement('div');
  dot.className = 'fest-poi-dot';

  wrap.append(tail, body, dot);
  return wrap;
}

function zoneStyle(feature: GeoJSON.Feature, selected: boolean) {
  return zoneFeatureStyle((feature.properties ?? {}) as MapZoneProperties, selected);
}

export function FestivalMapView({
  config,
  zones,
  paths,
  pois,
  userLocation,
  routeSegments,
  filter,
  selectedZoneId,
  selectedPoiId,
  followUser,
  onZonePress,
  onPoiPress,
  onMapPress,
  onZoneRoute,
  onPoiRoute,
  routing = false,
  onMapReady,
}: FestivalMapViewProps) {
  const containerRef = useRef<View>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<YandexMapInstance | null>(null);
  const readyRef = useRef(false);
  const onZonePressRef = useLatestRef(onZonePress);
  const onPoiPressRef = useLatestRef(onPoiPress);
  const onMapPressRef = useLatestRef(onMapPress);
  const onPoiRouteRef = useLatestRef(onPoiRoute);

  const zoneFeaturesRef = useRef<YandexMapEntity[]>([]);
  const pathFeaturesRef = useRef<YandexMapEntity[]>([]);
  const poiMarkersRef = useRef<YandexMapEntity[]>([]);
  const routeFeaturesRef = useRef<YandexMapEntity[]>([]);
  const userMarkerRef = useRef<YandexMapEntity | null>(null);
  const schemeOverlayRef = useRef<YandexMapEntity | null>(null);
  const listenerRef = useRef<YandexMapEntity | null>(null);
  const bundleRef = useRef<Awaited<ReturnType<typeof loadYandexMaps>> | null>(null);

  const filteredZones = useMemo(() => filterZoneFeatures(zones?.features ?? [], filter), [zones, filter]);
  const allPois = useMemo(() => pois?.features ?? [], [pois]);
  const zonesByIdRef = useRef(
    new Map<string, GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>>(),
  );

  const overlayUrl = useMemo(
    () => resolveMediaUrl(config.adminOverlay?.imageUrl),
    [config.adminOverlay?.imageUrl],
  );

  const overlay = config.adminOverlay;
  const overlaySignature = useMemo(() => {
    if (!overlayUrl || !overlay) return '';
    return JSON.stringify({
      url: overlayUrl,
      bounds: overlayToYandexLayoutBounds(overlay),
      opacity: overlay.opacity ?? 0.85,
      rotation: overlay.rotation ?? 0,
    });
  }, [overlayUrl, overlay]);
  const appliedSchemeRef = useRef('');

  useEffect(() => {
    if (!YANDEX_MAPS_API_KEY) return;

    const container = getContainerElement(containerRef);
    if (!container) return;

    ensureMapStyles();
    let cancelled = false;

    void (async () => {
      try {
        const bundle = await loadYandexMaps();
        if (cancelled || !container) return;

        bundleRef.current = bundle;
        const { ymaps3, YMapImageOverlay } = bundle;
        const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapListener } =
          ymaps3;

        const map = new YMap(
          container,
          {
            location: {
              center: [config.center.lng, config.center.lat],
              zoom: config.defaultZoom,
            },
            showScaleInCopyrights: true,
            behaviors: ['drag', 'scrollZoom', 'pinchZoom', 'dblClick'],
          },
          [new YMapDefaultSchemeLayer({ theme: 'dark' }), new YMapDefaultFeaturesLayer({})],
        );

        setupFestivalMapLayers(map, ymaps3);

        const listener = new YMapListener({
          layer: 'any',
          onClick: (object: YandexDomEventObject) => {
            let zone = object?.entity?.properties?.__zone as
              | GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>
              | undefined;
            if (!zone && object?.entity?.id?.startsWith('zone-')) {
              const zoneId = object.entity.id.slice('zone-'.length);
              zone = zonesByIdRef.current.get(zoneId);
            }
            if (zone) {
              onZonePressRef.current(zone);
              return;
            }
            const poi = object?.entity?.properties?.__poi as
              | GeoJSON.Feature<GeoJSON.Point, MapPoiProperties>
              | undefined;
            if (poi) {
              onPoiPressRef.current(poi);
              return;
            }
            onMapPressRef.current?.();
          },
        });
        map.addChild(listener);
        listenerRef.current = listener;

        mapRef.current = map;
        readyRef.current = true;
        setMapReady(true);

        onMapReady?.({
          flyTo: (lat, lng, zoom = config.defaultZoom) => {
            map.update?.({
              location: {
                center: [lng, lat],
                zoom,
                duration: 600,
              },
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
            map.update?.({
              location: {
                bounds: [
                  [minLng, minLat],
                  [maxLng, maxLat],
                ],
              },
            });
          },
        });

        if (overlayUrl && overlay && appliedSchemeRef.current !== overlaySignature) {
          container.style.setProperty('--fest-scheme-opacity', String(overlay.opacity ?? 0.85));
          container.style.setProperty('--fest-scheme-rotation', `${overlay.rotation ?? 0}deg`);
          const scheme = createSchemeOverlay(YMapImageOverlay, {
            bounds: overlayToYandexLayoutBounds(overlay),
            imageUrl: overlayUrl,
            className: 'fest-scheme-overlay',
          });
          map.addChild(scheme);
          schemeOverlayRef.current = scheme;
          appliedSchemeRef.current = overlaySignature;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось инициализировать Yandex Maps';
        console.error('[FestivalMapView] Yandex Maps init failed:', error);
        if (!cancelled) setInitError(message);
      }
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      setMapReady(false);
      /* eslint-disable react-hooks/exhaustive-deps -- Yandex map entities are torn down on unmount */
      const zones = zoneFeaturesRef.current;
      const paths = pathFeaturesRef.current;
      const pois = poiMarkersRef.current;
      const routes = routeFeaturesRef.current;
      /* eslint-enable react-hooks/exhaustive-deps */
      const map = mapRef.current;
      if (map) {
        if (schemeOverlayRef.current) map.removeChild(schemeOverlayRef.current);
        if (listenerRef.current) map.removeChild(listenerRef.current);
        removeAll(map, zones);
        removeAll(map, paths);
        removeAll(map, pois);
        removeAll(map, routes);
        if (userMarkerRef.current) map.removeChild(userMarkerRef.current);
        map.destroy?.();
      }
      mapRef.current = null;
      schemeOverlayRef.current = null;
      listenerRef.current = null;
      userMarkerRef.current = null;
    };
    // Map init is tied to festival center only; overlay and handlers use refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stable map instance
  }, [config.center.lat, config.center.lng, config.defaultZoom]);

  useEffect(() => {
    const map = mapRef.current;
    const bundle = bundleRef.current;
    if (!map || !mapReady || !bundle || appliedSchemeRef.current === overlaySignature) return;

    if (schemeOverlayRef.current) {
      map.removeChild(schemeOverlayRef.current);
      schemeOverlayRef.current = null;
    }

    const container = getContainerElement(containerRef);
    if (overlayUrl && overlay) {
      container?.style.setProperty('--fest-scheme-opacity', String(overlay.opacity ?? 0.85));
      container?.style.setProperty('--fest-scheme-rotation', `${overlay.rotation ?? 0}deg`);
      const scheme = createSchemeOverlay(bundle.YMapImageOverlay, {
        bounds: overlayToYandexLayoutBounds(overlay),
        imageUrl: overlayUrl,
        className: 'fest-scheme-overlay',
      });
      map.addChild(scheme);
      schemeOverlayRef.current = scheme;
    }
    appliedSchemeRef.current = overlaySignature;
  }, [mapReady, overlaySignature, overlayUrl, overlay]);

  useEffect(() => {
    const map = mapRef.current;
    const bundle = bundleRef.current;
    if (!map || !mapReady || !bundle) return;

    removeAll(map, zoneFeaturesRef.current);
    zonesByIdRef.current.clear();
    filteredZones.forEach((feature, index) => {
      if (feature.geometry.type !== 'Polygon') return;
      zonesByIdRef.current.set(feature.properties.id, feature);
      const isSelected = feature.properties.id === selectedZoneId;
      const item = new bundle.ymaps3.YMapFeature({
        id: `zone-${feature.properties.id ?? index}`,
        source: FEST_ZONE_SOURCE,
        geometry: feature.geometry,
        style: zoneStyle(feature, isSelected),
        properties: { __zone: feature },
      });
      map.addChild(item);
      zoneFeaturesRef.current.push(item);
    });
  }, [filteredZones, selectedZoneId, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const bundle = bundleRef.current;
    if (!map || !mapReady || !bundle) return;

    removeAll(map, pathFeaturesRef.current);
    paths?.features.forEach((feature, index) => {
      if (feature.geometry.type !== 'LineString') return;
      const item = new bundle.ymaps3.YMapFeature({
        id: `path-${index}`,
        source: FEST_PATH_SOURCE,
        geometry: feature.geometry,
        style: pathFeatureStyle(feature.properties ?? { id: `path-${index}` }),
      });
      map.addChild(item);
      pathFeaturesRef.current.push(item);
    });
  }, [paths, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const bundle = bundleRef.current;
    if (!map || !mapReady || !bundle) return;

    removeAll(map, poiMarkersRef.current);
    allPois.forEach((feature) => {
      if (feature.geometry.type !== 'Point') return;
      const [lng, lat] = feature.geometry.coordinates;
      const isSelected = feature.properties.id === selectedPoiId;
      const el = createPoiMarkerElement(feature, isSelected, () => {
        onPoiRouteRef.current?.();
      }, routing);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onPoiPressRef.current(feature);
      });

      const marker = new bundle.ymaps3.YMapMarker(
        {
          source: FEST_MARKER_SOURCE,
          coordinates: [lng, lat],
          properties: { __poi: feature, poiId: feature.properties.id },
          zIndex: isSelected ? 2 : 1,
        },
        el,
      );
      map.addChild(marker);
      poiMarkersRef.current.push(marker);
    });
  }, [allPois, selectedPoiId, mapReady, routing, onPoiPressRef, onPoiRouteRef]);

  useEffect(() => {
    const map = mapRef.current;
    const bundle = bundleRef.current;
    if (!map || !mapReady || !bundle) return;

    removeAll(map, routeFeaturesRef.current);
    routeSegments?.forEach((seg, index) => {
      const item = new bundle.ymaps3.YMapFeature({
        id: `route-${index}`,
        source: FEST_ROUTE_SOURCE,
        geometry: { type: 'LineString', coordinates: seg.coordinates },
        style: {
          stroke: [
            {
              width: seg.kind === 'external' ? 4 : 6,
              color: seg.kind === 'external' ? mapColors.routeExternal : mapColors.routeInternal,
              ...(seg.kind === 'external' ? { dash: [2, 2] as const } : {}),
            },
          ],
          simplificationRate: 0,
        },
      });
      map.addChild(item);
      routeFeaturesRef.current.push(item);
    });
  }, [routeSegments, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const bundle = bundleRef.current;
    if (!map || !mapReady || !bundle) return;

    if (userMarkerRef.current) {
      map.removeChild(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    if (!userLocation) return;

    const el = document.createElement('div');
    el.className = 'fest-user-marker';
    const marker = new bundle.ymaps3.YMapMarker(
      {
        source: FEST_MARKER_SOURCE,
        coordinates: [userLocation.lng, userLocation.lat],
        zIndex: 3,
      },
      el,
    );
    map.addChild(marker);
    userMarkerRef.current = marker;
  }, [userLocation, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !followUser || !userLocation) return;
    map.update?.({
      location: {
        center: [userLocation.lng, userLocation.lat],
        zoom: Math.max(config.defaultZoom, 16),
        duration: 600,
      },
    });
  }, [followUser, userLocation, config.defaultZoom]);

  if (!YANDEX_MAPS_API_KEY) {
    return (
      <View style={styles.fill}>
        <Text style={styles.error}>
          Задайте EXPO_PUBLIC_YANDEX_MAPS_API_KEY для отображения карты
        </Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View style={styles.fill}>
        <Text style={styles.error}>{initError}</Text>
      </View>
    );
  }

  return <View ref={containerRef} style={styles.fill} collapsable={false} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  error: {
    color: '#fff',
    textAlign: 'center',
    padding: 16,
  },
});
