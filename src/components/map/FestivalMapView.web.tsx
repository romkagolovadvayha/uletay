import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { FestivalMapViewProps } from './types';
import { resolveMediaUrl } from '../../config/api';
import { YANDEX_MAPS_API_KEY } from '../../config/yandexMaps';
import { mapColors } from '../../theme/map';
import type { MapPoiCategory, MapPoiProperties, MapZoneProperties } from '../../types/map';
import { filterPoiFeatures, filterZoneFeatures } from '../../utils/map/layerStyles';
import { pathFeatureStyle, zoneFeatureStyle } from '../../utils/map/featureStyles';
import { overlayToYandexLayoutBounds } from '../../utils/map/overlayGeoref';
import { loadYandexMaps } from '../../utils/map/yandexMapsLoader';
import { shouldShowZoneLabel, zoneLabelText } from '../../utils/map/zoneDisplay';
import {
  applyZoneLabelBoxStyle,
  createZoneLabelElements,
  zoneFillImageRotation,
  zoneLabelRotation,
} from '../../utils/map/zoneDecor';
import { zoneFillImageBounds, zoneImageLayout } from '../../utils/map/zoneFillImage';
import { ensureZoneLabelFont, zoneLabelCssRules } from '../../utils/map/zoneLabelCss';
import { useLatestRef } from '../../hooks/useLatestRef';

const STYLE_ID = 'fest-yandex-map-styles';

function ensureMapStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  ensureZoneLabelFont();
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
    .fest-user-marker {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: ${mapColors.userDot};
      border: 2px solid #fff;
      box-sizing: border-box;
      transform: translate(-50%, -50%);
    }
    .fest-poi-marker {
      min-width: 36px;
      height: 36px;
      padding: 0 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 18px;
      background: #1C1C1E;
      color: #FFC107;
      border: 2px solid rgba(255,255,255,.22);
      box-sizing: border-box;
      transform: translate(-50%, -50%);
      font: 800 11px/1 system-ui, sans-serif;
      box-shadow: 0 3px 10px rgba(0,0,0,.35);
      cursor: pointer;
    }
    .fest-poi-marker--selected {
      background: #FFC107;
      color: #000;
      border-color: #fff;
      transform: translate(-50%, -50%) scale(1.12);
    }
    ${zoneLabelCssRules('fest')}
    .fest-zone-fill-image {
      opacity: var(--fest-zone-fill-opacity, 0.92);
      transform: rotate(var(--fest-zone-fill-rotation, 0deg));
      transform-origin: center center;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

function getContainerElement(ref: React.RefObject<View | null>): HTMLElement | null {
  const node = ref.current as unknown as HTMLElement | null;
  if (!node?.nodeType || !node.classList) return null;
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
  zoneImages: 3500,
  routes: 3400,
  zones: 3600,
  zoneLabels: 3700,
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

function zoneStyle(feature: GeoJSON.Feature, selected: boolean) {
  return zoneFeatureStyle((feature.properties ?? {}) as MapZoneProperties, selected);
}

function poiGlyph(category: MapPoiCategory) {
  return {
    stage: '♪',
    foodcourt: 'ЕДА',
    toilet: 'WC',
    shower: 'ДУШ',
    water: 'H₂O',
    medical: '+',
    security: 'ЩИТ',
    info: 'i',
    entrance: 'ВХОД',
    parking: 'P',
    custom: '•',
  }[category];
}

export function FestivalMapView({
  config,
  zones,
  pois,
  paths,
  userLocation,
  userMarkers,
  routeSegments,
  filter,
  selectedZoneId,
  selectedPoiId,
  followUser,
  onZonePress,
  onPoiPress,
  onMapPress,
  onMapCoordinatePress,
  onMapReady,
  onMapLoaded,
  onMapLoadError,
}: FestivalMapViewProps) {
  const containerRef = useRef<View>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<YandexMapInstance | null>(null);
  const readyRef = useRef(false);
  const onZonePressRef = useLatestRef(onZonePress);
  const onPoiPressRef = useLatestRef(onPoiPress);
  const onMapPressRef = useLatestRef(onMapPress);
  const onMapCoordinatePressRef = useLatestRef(onMapCoordinatePress);

  const zoneFeaturesRef = useRef<YandexMapEntity[]>([]);
  const zoneImageRefs = useRef<YandexMapEntity[]>([]);
  const zoneLabelRefs = useRef<YandexMapEntity[]>([]);
  const pathFeaturesRef = useRef<YandexMapEntity[]>([]);
  const routeFeaturesRef = useRef<YandexMapEntity[]>([]);
  const poiMarkerRefs = useRef<YandexMapEntity[]>([]);
  const userMarkerRef = useRef<YandexMapEntity | null>(null);
  const schemeOverlayRef = useRef<YandexMapEntity | null>(null);
  const listenerRef = useRef<YandexMapEntity | null>(null);
  const bundleRef = useRef<Awaited<ReturnType<typeof loadYandexMaps>> | null>(null);
  const zoneLabelDecorRef = useRef<
    {
      box: HTMLDivElement;
      textEl: HTMLSpanElement;
      layout: ReturnType<typeof zoneImageLayout>;
      labelRotation: number;
    }[]
  >([]);
  const mapZoomRef = useRef(config.defaultZoom);
  const refreshZoneLabelSizesRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!YANDEX_MAPS_API_KEY) {
      onMapLoadError?.();
    }
  }, [onMapLoadError]);

  const filteredZones = useMemo(() => filterZoneFeatures(zones?.features ?? [], filter), [zones, filter]);
  const filteredPois = useMemo(() => filterPoiFeatures(pois?.features ?? [], filter), [pois, filter]);
  const zonesByIdRef = useRef(
    new Map<string, GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>>(),
  );
  const poisByIdRef = useRef(
    new Map<string, GeoJSON.Feature<GeoJSON.Point, MapPoiProperties>>(),
  );

  useEffect(() => {
    refreshZoneLabelSizesRef.current = () => {
      for (const item of zoneLabelDecorRef.current) {
        applyZoneLabelBoxStyle(
          item.box,
          item.textEl,
          item.layout,
          item.labelRotation,
          mapZoomRef.current,
        );
      }
    };
  });

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
          onUpdate: (event: { location?: { zoom?: number } }) => {
            const zoom = event?.location?.zoom;
            if (typeof zoom === 'number') {
              mapZoomRef.current = zoom;
              refreshZoneLabelSizesRef.current();
            }
          },
          onClick: (object: YandexDomEventObject, event?: { coordinates?: [number, number] }) => {
            let poi = object?.entity?.properties?.__poi as
              | GeoJSON.Feature<GeoJSON.Point, MapPoiProperties>
              | undefined;
            if (!poi && object?.entity?.id?.startsWith('poi-')) {
              const poiId = object.entity.id.slice('poi-'.length);
              poi = poisByIdRef.current.get(poiId);
            }
            if (poi) {
              onPoiPressRef.current(poi);
              return;
            }
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
            if (event?.coordinates) {
              onMapCoordinatePressRef.current?.({
                lat: event.coordinates[1],
                lng: event.coordinates[0],
              });
            } else {
              onMapPressRef.current?.();
            }
          },
        });
        map.addChild(listener);
        listenerRef.current = listener;

        mapRef.current = map;
        readyRef.current = true;
        setMapReady(true);
        onMapLoaded?.();

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
        if (!cancelled) {
          setInitError(message);
          onMapLoadError?.();
        }
      }
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      setMapReady(false);
      /* eslint-disable react-hooks/exhaustive-deps -- Yandex map entities are torn down on unmount */
      const zoneItems = zoneFeaturesRef.current;
      const zoneImages = zoneImageRefs.current;
      const zoneLabels = zoneLabelRefs.current;
      const pathItems = pathFeaturesRef.current;
      const routeItems = routeFeaturesRef.current;
      const poiItems = poiMarkerRefs.current;
      /* eslint-enable react-hooks/exhaustive-deps */
      const map = mapRef.current;
      if (map) {
        if (schemeOverlayRef.current) map.removeChild(schemeOverlayRef.current);
        if (listenerRef.current) map.removeChild(listenerRef.current);
        removeAll(map, zoneItems);
        removeAll(map, zoneImages);
        removeAll(map, zoneLabels);
        removeAll(map, pathItems);
        removeAll(map, routeItems);
        removeAll(map, poiItems);
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

    removeAll(map, zoneImageRefs.current);
    removeAll(map, zoneLabelRefs.current);
    zoneLabelDecorRef.current = [];

    const styleRules: string[] = [];
    filteredZones.forEach((feature) => {
      if (feature.geometry.type !== 'Polygon') return;
      const props = feature.properties;
      const layout = zoneImageLayout(feature);

      const imageUrl = resolveMediaUrl(props.fillImageUrl);
      if (imageUrl) {
        const opacity = props.fillImageOpacity ?? 0.92;
        const imageRotation = zoneFillImageRotation(props, layout);
        const classSuffix = props.id.replace(/[^a-zA-Z0-9_-]/g, '_');
        styleRules.push(
          `.fest-zone-fill-image--${classSuffix}{opacity:${opacity};transform:rotate(${imageRotation}deg);}`,
        );
        const overlay = new bundle.YMapImageOverlay({
          bounds: zoneFillImageBounds(layout),
          imageUrl,
          className: `fest-zone-fill-image fest-zone-fill-image--${classSuffix}`,
          zIndex: LAYER_Z.zoneImages,
        });
        map.addChild(overlay);
        zoneImageRefs.current.push(overlay);
      }

      if (shouldShowZoneLabel(props)) {
        const labelRotation = zoneLabelRotation(props, layout);
        const { box, textEl } = createZoneLabelElements(zoneLabelText(props));
        applyZoneLabelBoxStyle(box, textEl, layout, labelRotation, mapZoomRef.current);
        zoneLabelDecorRef.current.push({ box, textEl, layout, labelRotation });
        const marker = new bundle.ymaps3.YMapMarker(
          {
            source: FEST_MARKER_SOURCE,
            coordinates: [layout.center.lng, layout.center.lat],
            zIndex: LAYER_Z.zoneLabels,
          },
          box,
        );
        map.addChild(marker);
        zoneLabelRefs.current.push(marker);
      }
    });

    const styleId = 'fest-zone-fill-dynamic';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = styleRules.join('\n');
  }, [filteredZones, mapReady]);

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

    removeAll(map, poiMarkerRefs.current);
    poisByIdRef.current.clear();
    filteredPois.forEach((poi, index) => {
      if (poi.geometry.type !== 'Point') return;
      poisByIdRef.current.set(poi.properties.id, poi);
      const selected = poi.properties.id === selectedPoiId;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `fest-poi-marker${selected ? ' fest-poi-marker--selected' : ''}`;
      el.textContent = poiGlyph(poi.properties.category) ?? '•';
      el.setAttribute('aria-label', poi.properties.name);
      const marker = new bundle.ymaps3.YMapMarker(
        {
          id: `poi-${poi.properties.id ?? index}`,
          source: FEST_MARKER_SOURCE,
          coordinates: poi.geometry.coordinates,
          zIndex: LAYER_Z.markers + (selected ? 20 : 0),
          properties: { __poi: poi },
        },
        el,
      );
      map.addChild(marker);
      poiMarkerRefs.current.push(marker);
    });
    userMarkers?.forEach((saved) => {
      const el = document.createElement('div');
      el.className = 'fest-poi-marker fest-poi-marker--selected';
      el.textContent = saved.kind === 'car' ? '🚗' : '⛺';
      el.setAttribute('aria-label', saved.kind === 'car' ? 'Моя машина' : 'Моя палатка');
      const marker = new bundle.ymaps3.YMapMarker(
        {
          id: `saved-${saved.kind}`,
          source: FEST_MARKER_SOURCE,
          coordinates: [saved.coordinate.lng, saved.coordinate.lat],
          zIndex: LAYER_Z.markers + 30,
        },
        el,
      );
      map.addChild(marker);
      poiMarkerRefs.current.push(marker);
    });
  }, [filteredPois, mapReady, selectedPoiId, userMarkers]);

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
          Для интерактивной карты нужен локальный ключ Yandex Maps. Расписание и остальные разделы доступны офлайн.
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
