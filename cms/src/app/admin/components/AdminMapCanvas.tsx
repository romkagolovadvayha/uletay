'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJSONSource, Map as WebMap } from 'maplibre-gl';
import { loadMapLibre } from '../../../../../src/components/map/maplibre-loader.web';
import { festivalMapStyle, MAP_MAX_ZOOM, MAP_MIN_ZOOM } from '../../../../../src/components/map/map-style';
import {
  buildPaths,
  buildPlaceLabels,
  buildPlaceScene,
  buildRoutes,
  buildSceneImages,
  buildSiteGround,
  collection,
  sceneLayers,
} from '../../../../../src/components/map/map-scene';
import { syncWebMapScene, type AppliedScene } from '../../../../../src/components/map/web-map-scene';
import type { RouteSegment } from '../../../../../src/types/map';
import { useLatestRef } from '@/hooks/useLatestRef';
import { selectionFeature, type Coordinate, type MapSelection } from '@/lib/admin-map-model';
import type {
  FestivalMapConfig,
  MapAdminOverlay,
  MapPathsGeoJson,
  MapPoisGeoJson,
  MapZonesGeoJson,
} from '@/types';

export type MapHandle = {
  id: string;
  coordinate: Coordinate;
  title: string;
  kind?: 'vertex' | 'access';
  onMove?: (coordinate: Coordinate) => void;
  onCommit: (coordinate: Coordinate) => void;
};
const emptyZones: MapZonesGeoJson = { type: 'FeatureCollection', features: [] };
const emptyPaths: MapPathsGeoJson = { type: 'FeatureCollection', features: [] };
const emptyPois: MapPoisGeoJson = { type: 'FeatureCollection', features: [] };
const noHandles: MapHandle[] = [];

type Props = {
  config: FestivalMapConfig;
  zones?: MapZonesGeoJson;
  paths?: MapPathsGeoJson;
  pois?: MapPoisGeoJson;
  overlay?: MapAdminOverlay;
  selection?: MapSelection;
  handles?: MapHandle[];
  draft?: Coordinate[];
  drawing?: boolean;
  helpers?: boolean;
  preview?: boolean;
  focus?: { coordinates: Coordinate; token: number; bounds?: [Coordinate, Coordinate] };
  routes?: RouteSegment[];
  onClick?: (coordinate: Coordinate, selection: MapSelection) => void;
  className?: string;
};

/** The CMS and visitor app use the very same scene, lettering and vector style. */
export function AdminMapCanvas({
  config,
  zones = emptyZones,
  paths = emptyPaths,
  pois = emptyPois,
  overlay,
  selection = null,
  handles = noHandles,
  draft,
  drawing = false,
  helpers = false,
  preview = false,
  focus,
  routes,
  onClick,
  className = '',
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<WebMap | null>(null);
  const apiRef = useRef<typeof import('maplibre-gl') | null>(null);
  const applied = useRef<AppliedScene>({ sources: new Map(), images: new Map() });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [zoom, setZoom] = useState(config.defaultZoom);
  const clickRef = useLatestRef(onClick);
  const drawingRef = useLatestRef(drawing);
  const previewRef = useLatestRef(preview);
  const initial = useRef(config);

  useEffect(() => {
    let disposed = false;
    let resize: ResizeObserver | undefined;
    void loadMapLibre()
      .then((api) => {
        if (disposed || !container.current) return;
        apiRef.current = api;
        const c = initial.current;
        const map = new api.Map({
          container: container.current,
          locale: {
            'NavigationControl.ZoomIn': 'Приблизить',
            'NavigationControl.ZoomOut': 'Отдалить',
            'NavigationControl.ResetBearing': 'Север сверху',
            'AttributionControl.ToggleAttribution': 'Источники карты',
          },
          style: festivalMapStyle(),
          center: [c.center.lng, c.center.lat],
          zoom: c.defaultZoom,
          minZoom: MAP_MIN_ZOOM,
          maxZoom: MAP_MAX_ZOOM,
          maxPitch: 55,
          attributionControl: false,
          canvasContextAttributes: { antialias: false },
          maxTileCacheSize: 64,
        });
        mapRef.current = map;
        map.addControl(new api.NavigationControl(), 'top-right');
        const attribution = new api.AttributionControl({ compact: true });
        map.addControl(attribution, 'bottom-left');
        const attributionElement = container.current.querySelector('.maplibregl-ctrl-attrib');
        attributionElement?.classList.add('maplibregl-compact');
        attributionElement?.classList.remove('maplibregl-compact-show');
        attributionElement?.removeAttribute('open');
        map.addControl(new api.ScaleControl({ unit: 'metric' }), 'bottom-right');
        map.on('style.load', () => {
          if (!disposed) setReady(true);
        });
        map.on('zoomend', () => setZoom(map.getZoom()));
        map.on('webglcontextlost', () =>
          setError('Графический контекст потерян. Перезапустите карту — изменения сохранятся в редакторе.'),
        );
        map.on('click', (event) => {
          if (previewRef.current) return;
          const coordinate: Coordinate = [event.lngLat.lng, event.lngLat.lat];
          if (drawingRef.current) {
            clickRef.current?.(coordinate, null);
            return;
          }
          const ids = ['editor-poi-hit', 'editor-path-hit', 'editor-zone-hit'].filter((id) =>
            map.getLayer(id),
          );
          const hits = map.queryRenderedFeatures(
            [
              [event.point.x - 3, event.point.y - 3],
              [event.point.x + 3, event.point.y + 3],
            ],
            { layers: ids },
          );
          // Small objects win over camping grounds; markers and lines remain easy to target.
          const hit = hits.sort((a, b) => Number(b.properties.priority) - Number(a.properties.priority))[0];
          clickRef.current?.(coordinate, hit ? { kind: hit.properties.kind, id: hit.properties.id } : null);
        });
        resize = new ResizeObserver(() => {
          if (container.current?.clientWidth) map.resize();
        });
        resize.observe(container.current);
      })
      .catch(() => {
        if (!disposed) setError('Не удалось запустить карту. Проверьте соединение и повторите загрузку.');
      });
    return () => {
      disposed = true;
      resize?.disconnect();
      setReady(false);
      mapRef.current?.remove();
      mapRef.current = null;
      applied.current = { sources: new Map(), images: new Map() };
    };
  }, [attempt, clickRef, drawingRef, previewRef]);

  const sceneConfig = useMemo(() => ({ ...config, adminOverlay: overlay }), [config, overlay]);
  const places = useMemo(() => buildPlaceScene({ zones, pois, filter: 'all' }), [zones, pois]);
  const labels = useMemo(() => buildPlaceLabels(places.markers, zoom), [places.markers, zoom]);
  const scene = useMemo(
    () => ({
      sources: Object.entries({
        ground: buildSiteGround(sceneConfig),
        zones: places.shapes,
        rows: places.rows,
        paths: buildPaths(paths, zones),
        routes: buildRoutes(routes),
        lettering: places.lettering,
        places: labels.data,
      }).map(([id, data]) => ({ id, data, layers: sceneLayers[id] })),
      images: buildSceneImages(sceneConfig, places.zones, (url) => url),
    }),
    [sceneConfig, places, labels.data, paths, zones, routes],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    syncWebMapScene(map, scene, applied.current);
    const data = collection([
      ...zones.features.filter(f => helpers || f.properties.zoneType !== 'fence').flatMap((f) =>
        [f.geometry, ...(f.properties.geometryParts ?? [])].map((geometry) => ({
          type: 'Feature' as const,
          geometry,
          properties: {
            id: f.properties.id,
            kind: 'zone',
            priority: f.properties.parentZoneId
              ? 4
              : ['camping', 'parking', 'autocamp', 'comfort'].includes(f.properties.zoneType)
                ? 0
                : 3,
          },
        })),
      ),
      ...paths.features
        .filter((f) => helpers || (!f.properties.routingOnly && !f.properties.closed))
        .map((f) => ({ ...f, properties: { ...f.properties, kind: 'path', priority: 5 } })),
      ...pois.features.map((f) => ({ ...f, properties: { ...f.properties, kind: 'poi', priority: 6 } })),
    ]);
    if (!map.getSource('editor-hit')) {
      map.addSource('editor-hit', { type: 'geojson', data });
      map.addLayer({
        id: 'editor-zone-hit',
        type: 'fill',
        source: 'editor-hit',
        filter: ['==', ['get', 'kind'], 'zone'],
        paint: { 'fill-opacity': 0 },
      });
      map.addLayer({
        id: 'editor-path-hit',
        type: 'line',
        source: 'editor-hit',
        filter: ['==', ['get', 'kind'], 'path'],
        paint: { 'line-width': 8, 'line-opacity': 0 },
      });
      map.addLayer({
        id: 'editor-poi-hit',
        type: 'circle',
        source: 'editor-hit',
        filter: ['==', ['get', 'kind'], 'poi'],
        paint: {
          'circle-radius': 8,
          'circle-color': '#fff',
          'circle-stroke-color': '#186d63',
          'circle-stroke-width': 2,
        },
      });
    } else (map.getSource('editor-hit') as GeoJSONSource).setData(data);
    map.setPaintProperty('editor-poi-hit', 'circle-opacity', preview ? 0 : 1);
    map.setPaintProperty('editor-poi-hit', 'circle-stroke-opacity', preview ? 0 : 1);
  }, [ready, scene, zones, paths, pois, preview, helpers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const selected = selectionFeature(selection, zones, paths, pois);
    const data = collection(
      preview
        ? []
        : [
            ...(helpers
              ? paths.features
                  .filter((p) => p.properties.routingOnly || p.properties.closed)
                  .map((f) => ({ ...f, properties: { kind: 'helper' } }))
              : []),
            ...(helpers
              ? zones.features
                  .filter((f) => f.properties.zoneType === 'fence')
                  .map((f) => ({ ...f, properties: { kind: 'restricted' } }))
              : []),
            ...(selected ? [{ ...selected, properties: { kind: 'selected' } }] : []),
            ...(draft?.length
              ? [
                  {
                    type: 'Feature' as const,
                    geometry:
                      draft.length > 1
                        ? { type: 'LineString' as const, coordinates: draft }
                        : { type: 'Point' as const, coordinates: draft[0] },
                    properties: { kind: 'draft' },
                  },
                ]
              : []),
          ],
    );
    if (!map.getSource('editor-guides')) {
      map.addSource('editor-guides', { type: 'geojson', data });
      map.addLayer({
        id: 'editor-restricted',
        type: 'fill',
        source: 'editor-guides',
        filter: ['==', ['get', 'kind'], 'restricted'],
        paint: { 'fill-color': '#cd3f32', 'fill-opacity': 0.16 },
      });
      map.addLayer({
        id: 'editor-guide-lines',
        type: 'line',
        source: 'editor-guides',
        filter: ['!=', ['geometry-type'], 'Point'],
        paint: {
          'line-color': ['match', ['get', 'kind'], 'helper', '#8653af', 'restricted', '#cd3f32', '#007c8b'],
          'line-width': 3,
          'line-dasharray': [2, 2],
        },
      });
      map.addLayer({
        id: 'editor-guide-points',
        type: 'circle',
        source: 'editor-guides',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-color': '#ffd400',
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#186d63',
        },
      });
    } else (map.getSource('editor-guides') as GeoJSONSource).setData(data);
  }, [ready, selection, zones, paths, pois, draft, helpers, preview]);

  useEffect(() => {
    const map = mapRef.current,
      api = apiRef.current;
    if (!ready || !map || !api || preview) return;
    const markers = handles.map((handle) => {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = `admin-map-handle ${handle.kind ?? 'move'}`;
      element.title = handle.title;
      element.setAttribute('aria-label', handle.title);
      element.addEventListener('click', (e) => e.stopPropagation());
      const marker = new api.Marker({ element, draggable: true }).setLngLat(handle.coordinate).addTo(map);
      marker.on('drag', () => {
        const c = marker.getLngLat();
        handle.onMove?.([c.lng, c.lat]);
      });
      marker.on('dragend', () => {
        const c = marker.getLngLat();
        handle.onCommit([c.lng, c.lat]);
      });
      return marker;
    });
    return () => markers.forEach((marker) => marker.remove());
  }, [ready, handles, preview]);

  useEffect(() => {
    if (ready && focus) {
      if (focus.bounds) mapRef.current?.fitBounds(focus.bounds, { padding: 65, maxZoom: 19, duration: 600 });
      else mapRef.current?.flyTo({ center: focus.coordinates, zoom: 18.8, duration: 600 });
    }
  }, [ready, focus]);
  useEffect(() => {
    if (ready && routes?.length) {
      const coords = routes.flatMap((r) => r.coordinates);
      mapRef.current?.fitBounds(
        [
          [Math.min(...coords.map((c) => c[0])), Math.min(...coords.map((c) => c[1]))],
          [Math.max(...coords.map((c) => c[0])), Math.max(...coords.map((c) => c[1]))],
        ],
        { padding: 55, duration: 600 },
      );
    }
  }, [ready, routes]);
  useEffect(() => {
    if (ready) {
      mapRef.current?.easeTo({ pitch: preview ? 36 : 0, bearing: 0, duration: 400 });
      mapRef.current?.doubleClickZoom[drawing ? 'disable' : 'enable']();
      if (mapRef.current) mapRef.current.getCanvas().style.cursor = drawing ? 'crosshair' : '';
    }
  }, [ready, preview, drawing]);

  return (
    <div className={`admin-map-frame ${className}`} data-map-engine="maplibre">
      <div ref={container} className="admin-map-surface" aria-label="Карта фестиваля MapLibre" />
      {!ready && !error && (
        <div className="admin-map-loading" role="status">
          Загружаем карту фестиваля…
        </div>
      )}
      {error && (
        <div className="admin-map-error" role="alert">
          {error}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setError('');
              setAttempt((a) => a + 1);
            }}
          >
            Перезапустить карту
          </button>
        </div>
      )}
      <button
        type="button"
        className="admin-map-home btn-secondary"
        onClick={() => {
          const bounds = config.territoryBounds;
          if (bounds)
            mapRef.current?.fitBounds(
              [
                [bounds.sw.lng, bounds.sw.lat],
                [bounds.ne.lng, bounds.ne.lat],
              ],
              { padding: 35, duration: 500 },
            );
          else
            mapRef.current?.flyTo({
              center: [config.center.lng, config.center.lat],
              zoom: config.defaultZoom,
            });
        }}
      >
        Весь фестиваль
      </button>
    </div>
  );
}
