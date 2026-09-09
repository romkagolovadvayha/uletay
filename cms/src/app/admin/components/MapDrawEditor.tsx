'use client';

import { ContentRevision } from './ContentRevision';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { applySchemeOverlayStyle, ensureAdminMapStyles, upsertImageOverlay } from '@/lib/admin-yandex-map-layers';
import {
  defaultZoneProps,
  PATH_KIND_LABELS,
  pathFeatureStyle,
  type DrawTool,
  ZONE_TYPE_LABELS,
  zoneFeatureStyle,
} from '@/lib/map-draw-styles';
import {
  closeRing,
  newMapId,
  nudgeLatLng,
  openRing,
  polygonToRectLayout,
  rectToPolygon,
  ringCentroid,
  translateCoords,
  type RectLayout,
} from '@/lib/map-geometry';
import { useMapEditorHistory } from '@/lib/use-map-editor-history';
import { useLatestRef } from '@/hooks/useLatestRef';
import { overlayToYandexLayoutBounds } from '@/lib/map-overlay-georef';
import {
  applyZoneLabelBoxStyle,
  createZoneLabelElements,
  shouldShowZoneLabel,
  zoneFillImageBounds,
  zoneFillImageRotation,
  zoneImageLayout,
  zoneLabelRotation,
  zoneLabelText,
} from '@/lib/zone-map-helpers';
import { YANDEX_MAPS_API_KEY } from '@/lib/yandex-maps-config';
import { loadYandexMaps, type YandexMapsBundle } from '@/lib/yandex-maps-loader';
import type {
  FestivalMapConfig,
  MapAdminOverlay,
  MapPathProperties,
  MapPathsGeoJson,
  MapZoneProperties,
  MapZoneType,
  MapZonesGeoJson,
} from '@/types';

type Props = {
  config: FestivalMapConfig;
  zones: MapZonesGeoJson;
  paths: MapPathsGeoJson;
  overlay?: MapAdminOverlay;
  saveAction: (formData: FormData) => void | Promise<void>;
};

type Selection = { kind: 'zone'; id: string } | { kind: 'path'; id: string } | null;

function removeAll(map: YandexMapInstance, items: YandexMapEntity[]) {
  for (const item of items) {
    map.removeChild(item);
  }
  items.length = 0;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function updateMapGeometry(entity: YandexMapEntity | undefined, geometry: GeoJSON.Geometry) {
  entity?.update?.({ geometry });
}

export function MapDrawEditor({ config, zones: initialZones, paths: initialPaths, overlay, saveAction }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<YandexMapInstance | null>(null);
  const bundleRef = useRef<YandexMapsBundle | null>(null);
  const listenerRef = useRef<YandexMapEntity | null>(null);
  const featureRefs = useRef<YandexMapEntity[]>([]);
  const zoneDecorRefs = useRef<YandexMapEntity[]>([]);
  const handleRefs = useRef<YandexMapEntity[]>([]);
  const overlayRef = useRef<YandexMapEntity | null>(null);
  const draggingRef = useRef(false);
  const featureEntityRef = useRef<Map<string, YandexMapEntity>>(new Map());
  const lastDragCoordRef = useRef<YandexLngLat | null>(null);
  const mapZoomRef = useRef(config.defaultZoom);
  const zoneLabelDecorRef = useRef<
    {
      box: HTMLDivElement;
      textEl: HTMLSpanElement;
      layout: RectLayout;
      labelRotation: number;
    }[]
  >([]);
  const refreshZoneLabelSizesRef = useRef<() => void>(() => {});

  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [tool, setTool] = useState<DrawTool>('select');
  const [newZoneType, setNewZoneType] = useState<MapZoneType>('building');
  const [newPathKind, setNewPathKind] = useState<MapPathProperties['pathKind']>('road');
  const [selection, setSelection] = useState<Selection>(null);
  const [draftCoords, setDraftCoords] = useState<[number, number][]>([]);
  const { zones, paths, setZones, setPaths, undo, redo, canUndo, canRedo } = useMapEditorHistory({
    zones: initialZones,
    paths: initialPaths,
  });
  const [dirty, setDirty] = useState(false);
  const [zoneImageUploading, setZoneImageUploading] = useState(false);

  const markDirty = useCallback(() => setDirty(true), []);

  const selectObject = useCallback((kind: NonNullable<Selection>['kind'], id: string) => {
    setSelection({ kind, id });
  }, []);

  const selectObjectRef = useLatestRef(selectObject);

  const activeSelection = selection;

  const selectedZone = useMemo(
    () => (activeSelection?.kind === 'zone' ? zones.features.find((f) => f.properties.id === activeSelection.id) : undefined),
    [activeSelection, zones],
  );
  const selectedPath = useMemo(
    () => (activeSelection?.kind === 'path' ? paths.features.find((f) => f.properties.id === activeSelection.id) : undefined),
    [activeSelection, paths],
  );

  const overlayBounds = useMemo(() => {
    if (!overlay?.center || !overlay.widthMeters) return null;
    return overlayToYandexLayoutBounds(overlay);
  }, [overlay]);

  const updateZone = useCallback(
    (id: string, updater: (z: GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>) => GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>) => {
      setZones((prev) => ({
        ...prev,
        features: prev.features.map((f) => (f.properties.id === id ? updater(f) : f)),
      }));
      markDirty();
    },
    [markDirty, setZones],
  );

  const updatePath = useCallback(
    (id: string, updater: (p: GeoJSON.Feature<GeoJSON.LineString, MapPathProperties>) => GeoJSON.Feature<GeoJSON.LineString, MapPathProperties>) => {
      setPaths((prev) => ({
        ...prev,
        features: prev.features.map((f) => (f.properties.id === id ? updater(f) : f)),
      }));
      markDirty();
    },
    [markDirty, setPaths],
  );

  const uploadZoneFillImage = useCallback(
    async (zoneId: string, file: File) => {
      setZoneImageUploading(true);
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('kind', 'map');
        const res = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
        const payload = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !payload.url) {
          throw new Error(payload.error ?? 'Не удалось загрузить изображение');
        }
        updateZone(zoneId, (f) => ({
          ...f,
          properties: { ...f.properties, fillImageUrl: payload.url },
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Ошибка загрузки';
        window.alert(message);
      } finally {
        setZoneImageUploading(false);
      }
    },
    [updateZone],
  );

  const deleteSelection = useCallback(() => {
    if (!activeSelection) return;
    if (activeSelection.kind === 'zone') {
      setZones((prev) => ({ ...prev, features: prev.features.filter((f) => f.properties.id !== activeSelection.id) }));
    } else {
      setPaths((prev) => ({ ...prev, features: prev.features.filter((f) => f.properties.id !== activeSelection.id) }));
    }
    setSelection(null);
    markDirty();
  }, [activeSelection, markDirty, setZones, setPaths]);

  const duplicateSelection = useCallback(() => {
    if (!activeSelection) return;
    const offset = { northM: 0, eastM: 8 };
    if (activeSelection.kind === 'zone') {
      const src = zones.features.find((f) => f.properties.id === activeSelection.id);
      if (!src) return;
      const id = newMapId('zone');
      const layout = src.properties.layout;
      if (layout) {
        const center = nudgeLatLng(layout.center.lat, layout.center.lng, offset.northM, offset.eastM);
        const nextLayout = { ...layout, center };
        setZones((prev) => ({
          ...prev,
          features: [
            ...prev.features,
            {
              type: 'Feature',
              properties: { ...src.properties, id, layout: nextLayout },
              geometry: rectToPolygon(nextLayout),
            },
          ],
        }));
      } else {
        const ring = openRing(src.geometry.coordinates[0] as [number, number][]);
        const shifted = ring.map(([lng, lat]) => {
          const c = nudgeLatLng(lat, lng, offset.northM, offset.eastM);
          return [c.lng, c.lat] as [number, number];
        });
        setZones((prev) => ({
          ...prev,
          features: [
            ...prev.features,
            {
              type: 'Feature',
              properties: { ...src.properties, id },
              geometry: { type: 'Polygon', coordinates: [closeRing(shifted)] },
            },
          ],
        }));
      }
      setSelection({ kind: 'zone', id });
    } else if (activeSelection.kind === 'path') {
      const src = paths.features.find((f) => f.properties.id === activeSelection.id);
      if (!src) return;
      const id = newMapId('path');
      const shifted = (src.geometry.coordinates as [number, number][]).map(([lng, lat]) => {
        const c = nudgeLatLng(lat, lng, offset.northM, offset.eastM);
        return [c.lng, c.lat] as [number, number];
      });
      setPaths((prev) => ({
        ...prev,
        features: [
          ...prev.features,
          {
            type: 'Feature',
            properties: { ...src.properties, id },
            geometry: { type: 'LineString', coordinates: shifted },
          },
        ],
      }));
      setSelection({ kind: 'path', id });
    }
    markDirty();
  }, [activeSelection, zones, paths, markDirty, setZones, setPaths]);

  const convertZoneToRect = useCallback(() => {
    if (!selectedZone || selectedZone.properties.layout) return;
    const ring = selectedZone.geometry.coordinates[0] as [number, number][];
    const layout = polygonToRectLayout(ring);
    updateZone(selectedZone.properties.id, (f) => ({
      ...f,
      properties: { ...f.properties, layout },
      geometry: rectToPolygon(layout),
    }));
  }, [selectedZone, updateZone]);

  const finishDraft = useCallback(() => {
    if (draftCoords.length < 2) return;
    if (tool === 'line') {
      const id = newMapId('path');
      setPaths((prev) => ({
        ...prev,
        features: [
          ...prev.features,
          {
            type: 'Feature',
            properties: { id, name: PATH_KIND_LABELS[newPathKind ?? 'road'], pathKind: newPathKind ?? 'road' },
            geometry: { type: 'LineString', coordinates: [...draftCoords] },
          },
        ],
      }));
      setSelection({ kind: 'path', id });
    } else if (tool === 'polygon' && draftCoords.length >= 3) {
      const id = newMapId('zone');
      const props = defaultZoneProps(newZoneType, ZONE_TYPE_LABELS[newZoneType], id);
      setZones((prev) => ({
        ...prev,
        features: [
          ...prev.features,
          {
            type: 'Feature',
            properties: props,
            geometry: { type: 'Polygon', coordinates: [closeRing(draftCoords)] },
          },
        ],
      }));
      setSelection({ kind: 'zone', id });
    }
    setDraftCoords([]);
    setTool('select');
    markDirty();
  }, [draftCoords, tool, newPathKind, newZoneType, markDirty, setPaths, setZones]);

  const handleMapClick = useCallback(
    (coordinates: YandexLngLat) => {
      const [lng, lat] = coordinates;
      if (tool === 'line' || tool === 'polygon') {
        setDraftCoords((prev) => [...prev, [lng, lat]]);
        return;
      }
      if (tool === 'rect') {
        const id = newMapId('zone');
        const layout: RectLayout = {
          center: { lat, lng },
          widthMeters: 24,
          heightMeters: 16,
          rotation: 0,
        };
        const props = {
          ...defaultZoneProps(newZoneType, ZONE_TYPE_LABELS[newZoneType], id),
          layout,
        };
        setZones((prev) => ({
          ...prev,
          features: [
            ...prev.features,
            { type: 'Feature', properties: props, geometry: rectToPolygon(layout) },
          ],
        }));
        setSelection({ kind: 'zone', id });
        setTool('select');
        markDirty();
        return;
      }
    },
    [tool, newZoneType, markDirty, setZones],
  );

  const handleMapClickRef = useLatestRef(handleMapClick);
  const toolRef = useLatestRef(tool);
  const finishDraftRef = useLatestRef(finishDraft);
  const deleteSelectionRef = useLatestRef(deleteSelection);
  const undoRef = useLatestRef(undo);
  const redoRef = useLatestRef(redo);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoRef.current();
        markDirty();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redoRef.current();
        markDirty();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectionRef.current();
        return;
      }
      if (e.key === 'Escape') {
        if (draftCoords.length > 0) {
          setDraftCoords([]);
          setTool('select');
        } else {
          setSelection(null);
        }
        return;
      }
      if (e.key === 'Enter' && (toolRef.current === 'line' || toolRef.current === 'polygon')) {
        finishDraftRef.current();
        return;
      }
      const toolKeys: Record<string, DrawTool> = {
        '1': 'select',
        '2': 'rect',
        '3': 'line',
        '4': 'polygon',
      };
      if (toolKeys[e.key]) {
        const next = toolKeys[e.key];
        setTool(next);
        setDraftCoords([]);
        if (next !== 'select') setSelection(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [draftCoords.length, markDirty, deleteSelectionRef, finishDraftRef, redoRef, toolRef, undoRef]);

  useEffect(() => {
    if (!YANDEX_MAPS_API_KEY || !containerRef.current || mapRef.current) return;
    ensureAdminMapStyles();
    containerRef.current.classList.add('admin-yandex-map');
    let cancelled = false;

    void (async () => {
      try {
        const bundle = await loadYandexMaps();
        if (cancelled || !containerRef.current) return;
        bundleRef.current = bundle;
        const { ymaps3 } = bundle;
        const map = new ymaps3.YMap(
          containerRef.current,
          {
            location: { center: [config.center.lng, config.center.lat], zoom: config.defaultZoom },
            showScaleInCopyrights: true,
            behaviors: ['drag', 'scrollZoom', 'pinchZoom', 'dblClick'],
          },
          [new ymaps3.YMapDefaultSchemeLayer({ theme: 'dark' }), new ymaps3.YMapDefaultFeaturesLayer({})],
        );

        const listener = new ymaps3.YMapListener({
          layer: 'any',
          onUpdate: (event: { location?: { zoom?: number } }) => {
            const zoom = event?.location?.zoom;
            if (typeof zoom === 'number') {
              mapZoomRef.current = zoom;
              refreshZoneLabelSizesRef.current();
            }
          },
          onClick: (object, evt) => {
            if (draggingRef.current) return;
            const props = object?.entity?.properties as Record<string, unknown> | undefined;
            const editorKind = props?.__editorKind as string | undefined;
            const editorId = props?.__editorId as string | undefined;
            if (editorKind && editorId && toolRef.current === 'select') {
              selectObjectRef.current(editorKind as 'zone' | 'path', editorId);
              return;
            }
            if (toolRef.current !== 'select' && evt?.coordinates) {
              handleMapClickRef.current(evt.coordinates);
            } else if (toolRef.current === 'select') {
              setSelection(null);
            }
          },
        });
        map.addChild(listener);
        listenerRef.current = listener;
        mapRef.current = map;
        setReady(true);
      } catch (error) {
        if (!cancelled) setInitError(error instanceof Error ? error.message : 'Ошибка карты');
      }
    })();

    return () => {
      cancelled = true;
      setReady(false);
      const map = mapRef.current;
      if (map) {
        /* eslint-disable react-hooks/exhaustive-deps -- Yandex map entities are torn down on unmount */
        const features = featureRefs.current;
        const zoneDecor = zoneDecorRefs.current;
        const handles = handleRefs.current;
        /* eslint-enable react-hooks/exhaustive-deps */
        if (overlayRef.current) map.removeChild(overlayRef.current);
        if (listenerRef.current) map.removeChild(listenerRef.current);
        removeAll(map, features);
        removeAll(map, zoneDecor);
        removeAll(map, handles);
        map.destroy?.();
      }
      mapRef.current = null;
      bundleRef.current = null;
    };
  }, [config.center.lat, config.center.lng, config.defaultZoom, handleMapClickRef, selectObjectRef, toolRef]);

  useEffect(() => {
    const map = mapRef.current;
    const bundle = bundleRef.current;
    if (!map || !ready || !bundle || draggingRef.current) return;

    removeAll(map, featureRefs.current);
    removeAll(map, zoneDecorRefs.current);
    featureEntityRef.current.clear();

    for (const feature of zones.features) {
      const item = new bundle.ymaps3.YMapFeature({
        id: `zone-${feature.properties.id}`,
        geometry: feature.geometry,
        style: zoneFeatureStyle(feature.properties),
        properties: { __editorKind: 'zone', __editorId: feature.properties.id },
      });
      map.addChild(item);
      featureRefs.current.push(item);
      featureEntityRef.current.set(`zone-${feature.properties.id}`, item);
    }

    for (const feature of paths.features) {
      const item = new bundle.ymaps3.YMapFeature({
        id: `path-${feature.properties.id}`,
        geometry: feature.geometry,
        style: pathFeatureStyle(feature.properties),
        properties: { __editorKind: 'path', __editorId: feature.properties.id },
      });
      map.addChild(item);
      featureRefs.current.push(item);
      featureEntityRef.current.set(`path-${feature.properties.id}`, item);
    }

    const styleRules: string[] = [];
    zoneLabelDecorRef.current = [];
    for (const feature of zones.features) {
      const props = feature.properties;
      const zoneLayout = zoneImageLayout(feature);

      if (props.fillImageUrl) {
        const classSuffix = props.id.replace(/[^a-zA-Z0-9_-]/g, '_');
        const opacity = props.fillImageOpacity ?? 0.92;
        const imageRotation = zoneFillImageRotation(props, zoneLayout);
        styleRules.push(
          `.admin-zone-fill-image--${classSuffix}{opacity:${opacity};transform:rotate(${imageRotation}deg);}`,
        );
        const overlay = new bundle.YMapImageOverlay({
          bounds: zoneFillImageBounds(zoneLayout),
          imageUrl: props.fillImageUrl,
          className: `admin-zone-fill-image admin-zone-fill-image--${classSuffix}`,
        });
        map.addChild(overlay);
        zoneDecorRefs.current.push(overlay);
      }

      if (shouldShowZoneLabel(props)) {
        const labelRotation = zoneLabelRotation(props, zoneLayout);
        const { box, textEl } = createZoneLabelElements(zoneLabelText(props));
        applyZoneLabelBoxStyle(box, textEl, zoneLayout, labelRotation, mapZoomRef.current);
        zoneLabelDecorRef.current.push({ box, textEl, layout: zoneLayout, labelRotation });
        const marker = new bundle.ymaps3.YMapMarker(
          { coordinates: [zoneLayout.center.lng, zoneLayout.center.lat] },
          box,
        );
        map.addChild(marker);
        zoneDecorRefs.current.push(marker);
      }
    }

    const styleId = 'admin-zone-fill-dynamic';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = styleRules.join('\n');
    refreshZoneLabelSizesRef.current();

    if (draftCoords.length >= 2 && tool === 'line') {
      const draft = new bundle.ymaps3.YMapFeature({
        id: 'draft-line',
        geometry: { type: 'LineString', coordinates: draftCoords },
        style: { stroke: [{ width: 4, color: '#74ACFC', dash: [4, 4] }], simplificationRate: 0 },
      });
      map.addChild(draft);
      featureRefs.current.push(draft);
    }
    if (draftCoords.length >= 2 && tool === 'polygon') {
      const ring = draftCoords.length >= 3 ? closeRing(draftCoords) : draftCoords;
      const draft = new bundle.ymaps3.YMapFeature({
        id: 'draft-polygon',
        geometry: { type: 'Polygon', coordinates: [ring] },
        style: {
          fill: 'rgba(116, 172, 252, 0.15)',
          stroke: [{ width: 2, color: '#74ACFC', dash: [3, 3] }],
          simplificationRate: 0,
        },
      });
      map.addChild(draft);
      featureRefs.current.push(draft);
    }

    if (overlay?.imageUrl && overlayBounds) {
      applySchemeOverlayStyle(containerRef.current, {
        opacity: overlay.opacity ?? 0.5,
        rotation: overlay.rotation ?? 0,
      });
      overlayRef.current = upsertImageOverlay(map, bundle, overlayRef.current, {
        bounds: overlayBounds,
        imageUrl: overlay.imageUrl,
      });
    }

    // Ручки поверх PNG-схемы
  }, [ready, zones, paths, draftCoords, tool, overlay, overlayBounds, activeSelection, selectObjectRef, toolRef]);

  useEffect(() => {
    const map = mapRef.current;
    const bundle = bundleRef.current;
    if (!map || !ready || !bundle || draggingRef.current) return;

    removeAll(map, handleRefs.current);

    const finishDrag = (commit: () => void) => {
      draggingRef.current = false;
      commit();
    };

    const addCenterHandle = (
      coordinates: YandexLngLat,
      onMove: (anchor: YandexLngLat, initial: [number, number][], current: YandexLngLat) => void,
      onCommit: (anchor: YandexLngLat, initial: [number, number][], current: YandexLngLat) => void,
      getInitial: () => [number, number][],
    ) => {
      const el = document.createElement('div');
      el.className = 'editor-move-handle';
      el.title = 'Перетащить объект';

      let anchor: YandexLngLat = coordinates;
      let initialCoords: [number, number][] = getInitial();

      let marker: YandexMapEntity;
      marker = new bundle.ymaps3.YMapMarker(
        {
          coordinates,
          draggable: true,
          zIndex: 3300,
          blockBehaviors: true,
          onDragStart: () => {
            draggingRef.current = true;
            anchor = coordinates;
            initialCoords = getInitial();
            lastDragCoordRef.current = coordinates;
          },
          onDragMove: (c: YandexLngLat) => {
            marker.update?.({ coordinates: c });
            lastDragCoordRef.current = c;
            onMove(anchor, initialCoords, c);
          },
          onDragEnd: () => {
            const c = lastDragCoordRef.current;
            if (c) finishDrag(() => onCommit(anchor, initialCoords, c));
            else draggingRef.current = false;
          },
        },
        el,
      );
      map.addChild(marker);
      handleRefs.current.push(marker);
    };

    const addHandle = (
      coordinates: YandexLngLat,
      onMove: (c: YandexLngLat) => void,
      onCommit: (c: YandexLngLat) => void,
    ) => {
      const el = document.createElement('div');
      el.className = 'editor-vertex-handle';
      const marker = new bundle.ymaps3.YMapMarker(
        {
          coordinates,
          draggable: true,
          zIndex: 3000,
          blockBehaviors: true,
          onDragStart: () => {
            draggingRef.current = true;
            lastDragCoordRef.current = coordinates;
          },
          onDragMove: (c: YandexLngLat) => {
            marker.update?.({ coordinates: c });
            lastDragCoordRef.current = c;
            onMove(c);
          },
          onDragEnd: () => {
            const c = lastDragCoordRef.current;
            if (c) finishDrag(() => onCommit(c));
            else draggingRef.current = false;
          },
        },
        el,
      );
      map.addChild(marker);
      handleRefs.current.push(marker);
    };

    if (selectedZone?.properties.layout) {
      const zoneId = selectedZone.properties.id;
      const layout = selectedZone.properties.layout;
      const el = document.createElement('div');
      el.className = 'editor-move-handle';
      el.title = 'Перетащить объект';
      const centerCoord: YandexLngLat = [layout.center.lng, layout.center.lat];
      let initialLayout = layout;

      let centerMarker: YandexMapEntity;
      centerMarker = new bundle.ymaps3.YMapMarker(
        {
          coordinates: centerCoord,
          draggable: true,
          zIndex: 3300,
          blockBehaviors: true,
          onDragStart: () => {
            draggingRef.current = true;
            initialLayout = layout;
            lastDragCoordRef.current = centerCoord;
          },
          onDragMove: (c: YandexLngLat) => {
            centerMarker.update?.({ coordinates: c });
            lastDragCoordRef.current = c;
            const nextLayout = { ...initialLayout, center: { lng: c[0], lat: c[1] } };
            updateMapGeometry(featureEntityRef.current.get(`zone-${zoneId}`), rectToPolygon(nextLayout));
          },
          onDragEnd: () => {
            const c = lastDragCoordRef.current;
            if (!c) {
              draggingRef.current = false;
              return;
            }
            finishDrag(() => {
              const nextLayout = { ...initialLayout, center: { lng: c[0], lat: c[1] } };
              updateZone(zoneId, (f) => ({
                ...f,
                properties: { ...f.properties, layout: nextLayout },
                geometry: rectToPolygon(nextLayout),
              }));
            });
          },
        },
        el,
      );
      map.addChild(centerMarker);
      handleRefs.current.push(centerMarker);
    } else if (selectedZone) {
      const zoneId = selectedZone.properties.id;
      const ring = openRing(selectedZone.geometry.coordinates[0] as [number, number][]);
      const centroid = ringCentroid(ring);

      addCenterHandle(
        [centroid.lng, centroid.lat],
        (anchor, initial, current) => {
          const dLng = current[0] - anchor[0];
          const dLat = current[1] - anchor[1];
          const nextRing = translateCoords(initial, dLng, dLat);
          updateMapGeometry(featureEntityRef.current.get(`zone-${zoneId}`), {
            type: 'Polygon',
            coordinates: [closeRing(nextRing)],
          });
        },
        (_anchor, initial, current) => {
          const dLng = current[0] - _anchor[0];
          const dLat = current[1] - _anchor[1];
          updateZone(zoneId, (f) => ({
            ...f,
            geometry: {
              type: 'Polygon',
              coordinates: [closeRing(translateCoords(initial, dLng, dLat))],
            },
          }));
        },
        () => openRing(selectedZone.geometry.coordinates[0] as [number, number][]),
      );

      ring.forEach((coord, index) => {
        addHandle(
          coord,
          (c) => {
            const nextRing = openRing(selectedZone.geometry.coordinates[0] as [number, number][]);
            nextRing[index] = c;
            updateMapGeometry(featureEntityRef.current.get(`zone-${zoneId}`), {
              type: 'Polygon',
              coordinates: [closeRing(nextRing)],
            });
          },
          (c) => {
            updateZone(zoneId, (f) => {
              const nextRing = openRing(f.geometry.coordinates[0] as [number, number][]);
              nextRing[index] = c;
              return { ...f, geometry: { type: 'Polygon', coordinates: [closeRing(nextRing)] } };
            });
          },
        );
      });
    }

    if (selectedPath) {
      const pathId = selectedPath.properties.id;
      const lineCoords = selectedPath.geometry.coordinates as [number, number][];
      const pathCenter = ringCentroid(lineCoords);

      addCenterHandle(
        [pathCenter.lng, pathCenter.lat],
        (anchor, initial, current) => {
          const dLng = current[0] - anchor[0];
          const dLat = current[1] - anchor[1];
          updateMapGeometry(featureEntityRef.current.get(`path-${pathId}`), {
            type: 'LineString',
            coordinates: translateCoords(initial, dLng, dLat),
          });
        },
        (anchor, initial, current) => {
          const dLng = current[0] - anchor[0];
          const dLat = current[1] - anchor[1];
          updatePath(pathId, (f) => ({
            ...f,
            geometry: { type: 'LineString', coordinates: translateCoords(initial, dLng, dLat) },
          }));
        },
        () => [...lineCoords],
      );

      lineCoords.forEach((coord, index) => {
        addHandle(
          coord as YandexLngLat,
          (c) => {
            const next = [...selectedPath.geometry.coordinates] as [number, number][];
            next[index] = c;
            updateMapGeometry(featureEntityRef.current.get(`path-${pathId}`), {
              type: 'LineString',
              coordinates: next,
            });
          },
          (c) => {
            updatePath(pathId, (f) => {
              const next = [...f.geometry.coordinates] as [number, number][];
              next[index] = c;
              return { ...f, geometry: { type: 'LineString', coordinates: next } };
            });
          },
        );
      });
    }

    // Ручки поверх PNG-схемы
    for (const handle of handleRefs.current) {
      map.removeChild(handle);
      map.addChild(handle);
    }
  }, [ready, selectedZone, selectedPath, updateZone, updatePath]);

  const layout = selectedZone?.properties.layout;

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

  const layerItems = useMemo(() => {
    const items: { kind: 'zone' | 'path'; id: string; label: string; group: string }[] = [];
    for (const f of zones.features) {
      items.push({
        kind: 'zone',
        id: f.properties.id,
        label: f.properties.name,
        group: ZONE_TYPE_LABELS[f.properties.zoneType] ?? 'Зона',
      });
    }
    for (const f of paths.features) {
      items.push({
        kind: 'path',
        id: f.properties.id,
        label: f.properties.name ?? f.properties.id,
        group: PATH_KIND_LABELS[f.properties.pathKind ?? 'road'],
      });
    }
    return items;
  }, [zones, paths]);

  return (
    <div className="panel map-draw-editor">
      <h2>Редактор карты</h2>
      <p className="hint">
        Прямоугольник — здания, линия — дороги/заборы, полигон — зоны. Выделите объект
        и перетащите жёлтый маркер в центре; синие точки — вершины для изменения формы.
        инструменты, Enter — завершить линию/полигон, Del — удалить, Esc — отмена, Ctrl+Z / Ctrl+Y — отмена/повтор.
      </p>

      <div className="map-draw-toolbar">
        {(
          [
            ['select', 'Выбор (1)'],
            ['rect', 'Прямоугольник (2)'],
            ['line', 'Линия (3)'],
            ['polygon', 'Полигон (4)'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tool === id ? 'btn-primary btn-mini' : 'btn-secondary btn-mini'}
            onClick={() => {
              setTool(id);
              setDraftCoords([]);
              if (id !== 'select') setSelection(null);
            }}
          >
            {label}
          </button>
        ))}

        {tool === 'rect' || tool === 'polygon' ? (
          <label className="map-draw-preset">
            Тип зоны
            <select value={newZoneType} onChange={(e) => setNewZoneType(e.target.value as MapZoneType)}>
              {Object.entries(ZONE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {tool === 'line' ? (
          <label className="map-draw-preset">
            Тип линии
            <select
              value={newPathKind ?? 'road'}
              onChange={(e) => setNewPathKind(e.target.value as MapPathProperties['pathKind'])}
            >
              {Object.entries(PATH_KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {(tool === 'line' || tool === 'polygon') && draftCoords.length >= 2 ? (
          <button type="button" className="btn-primary btn-mini" onClick={finishDraft}>
            Завершить {tool === 'line' ? 'линию' : 'полигон'} (Enter)
          </button>
        ) : null}

        {(tool === 'line' || tool === 'polygon') && draftCoords.length > 0 ? (
          <button
            type="button"
            className="btn-secondary btn-mini"
            onClick={() => {
              setDraftCoords((prev) => prev.slice(0, -1));
            }}
          >
            Отменить точку
          </button>
        ) : null}

        <button type="button" className="btn-secondary btn-mini" disabled={!canUndo} onClick={() => { undo(); markDirty(); }}>
          ↶ Отмена
        </button>
        <button type="button" className="btn-secondary btn-mini" disabled={!canRedo} onClick={() => { redo(); markDirty(); }}>
          ↷ Повтор
        </button>

        {activeSelection ? (
          <>
            <button type="button" className="btn-secondary btn-mini" onClick={duplicateSelection}>
              Дублировать
            </button>
            <button type="button" className="link-button danger" onClick={deleteSelection}>
              Удалить (Del)
            </button>
          </>
        ) : null}
      </div>

      <div className="map-draw-layout">
        <div className="map-draw-main">
          {!YANDEX_MAPS_API_KEY ? (
            <div className="map-preview map-preview--loading map-draw-canvas">Нет ключа Yandex Maps</div>
          ) : initError ? (
            <div className="map-preview map-preview--loading map-draw-canvas">{initError}</div>
          ) : (
            <div ref={containerRef} className="map-preview map-draw-canvas admin-yandex-map" />
          )}
        </div>

        <aside className="map-draw-sidebar">
          <h3>Слои ({layerItems.length})</h3>
          <ul className="map-layer-list">
            {layerItems.length === 0 ? (
              <li className="map-layer-empty">Нет объектов — нарисуйте на карте</li>
            ) : (
              layerItems.map((item) => {
                const active =
                  activeSelection?.kind === item.kind && activeSelection.id === item.id;
                return (
                  <li key={`${item.kind}-${item.id}`}>
                    <button
                      type="button"
                      className={active ? 'map-layer-item active' : 'map-layer-item'}
                      onClick={() => selectObject(item.kind, item.id)}
                    >
                      <span className="map-layer-kind">{item.group}</span>
                      <span className="map-layer-name">{item.label}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>
      </div>

      {activeSelection && selectedZone ? (
        <div className="map-draw-props">
          <h3>Зона: {selectedZone.properties.name}</h3>
          <div className="grid">
            <label>
              Название
              <input
                value={selectedZone.properties.name}
                onChange={(e) =>
                  updateZone(selectedZone.properties.id, (f) => ({
                    ...f,
                    properties: { ...f.properties, name: e.target.value },
                  }))
                }
              />
            </label>
            <label>
              Тип
              <select
                value={selectedZone.properties.zoneType}
                onChange={(e) =>
                  updateZone(selectedZone.properties.id, (f) => ({
                    ...f,
                    properties: { ...f.properties, zoneType: e.target.value as MapZoneType },
                  }))
                }
              >
                {Object.entries(ZONE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="map-draw-checkbox">
              <input
                type="checkbox"
                checked={shouldShowZoneLabel(selectedZone.properties)}
                onChange={(e) =>
                  updateZone(selectedZone.properties.id, (f) => ({
                    ...f,
                    properties: { ...f.properties, showLabel: e.target.checked },
                  }))
                }
              />
              Показывать название на карте
            </label>
            <label>
              Поворот подписи (°)
              <input
                type="number"
                step="1"
                value={Math.round(
                  selectedZone.properties.labelRotation ??
                    zoneImageLayout(selectedZone).rotation,
                )}
                onChange={(e) =>
                  updateZone(selectedZone.properties.id, (f) => ({
                    ...f,
                    properties: {
                      ...f.properties,
                      labelRotation: clamp(Number(e.target.value), -180, 180),
                    },
                  }))
                }
              />
            </label>
          </div>
          <div className="map-zone-image-controls">
            <span className="map-zone-image-title">Фон полигона</span>
            <div className="map-zone-image-row">
              <label className="file-label">
                PNG / JPEG
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={zoneImageUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.currentTarget.value = '';
                    if (file) void uploadZoneFillImage(selectedZone.properties.id, file);
                  }}
                />
              </label>
              {selectedZone.properties.fillImageUrl ? (
                <button
                  type="button"
                  className="link-button danger"
                  onClick={() =>
                    updateZone(selectedZone.properties.id, (f) => ({
                      ...f,
                      properties: { ...f.properties, fillImageUrl: undefined, fillImageOpacity: undefined, fillImageRotation: undefined },
                    }))
                  }
                >
                  Удалить фон
                </button>
              ) : null}
            </div>
            {selectedZone.properties.fillImageUrl ? (
              <>
                <img
                  src={selectedZone.properties.fillImageUrl}
                  alt="Превью фона зоны"
                  className="map-zone-image-preview"
                />
                <label>
                  Прозрачность фона ({Math.round((selectedZone.properties.fillImageOpacity ?? 0.92) * 100)}%)
                  <input
                    type="range"
                    min={0.2}
                    max={1}
                    step={0.05}
                    value={selectedZone.properties.fillImageOpacity ?? 0.92}
                    onChange={(e) =>
                      updateZone(selectedZone.properties.id, (f) => ({
                        ...f,
                        properties: {
                          ...f.properties,
                          fillImageOpacity: Number(e.target.value),
                        },
                      }))
                    }
                  />
                </label>
                <label>
                  Поворот картинки (°)
                  <input
                    type="number"
                    step="1"
                    value={Math.round(
                      selectedZone.properties.fillImageRotation ??
                        zoneImageLayout(selectedZone).rotation,
                    )}
                    onChange={(e) =>
                      updateZone(selectedZone.properties.id, (f) => ({
                        ...f,
                        properties: {
                          ...f.properties,
                          fillImageRotation: clamp(Number(e.target.value), -180, 180),
                        },
                      }))
                    }
                  />
                </label>
              </>
            ) : (
              <p className="hint">Загрузите картинку — она заполнит полигон (по его границам).</p>
            )}
          </div>
          {layout ? (
            <div className="overlay-controls">
              <label>
                Ширина (м)
                <input
                  type="number"
                  value={Math.round(layout.widthMeters)}
                  onChange={(e) => {
                    const widthMeters = clamp(Number(e.target.value), 2, 2500);
                    const nextLayout = { ...layout, widthMeters };
                    updateZone(selectedZone.properties.id, (f) => ({
                      ...f,
                      properties: { ...f.properties, layout: nextLayout },
                      geometry: rectToPolygon(nextLayout),
                    }));
                  }}
                />
              </label>
              <label>
                Высота (м)
                <input
                  type="number"
                  value={Math.round(layout.heightMeters)}
                  onChange={(e) => {
                    const heightMeters = clamp(Number(e.target.value), 2, 2500);
                    const nextLayout = { ...layout, heightMeters };
                    updateZone(selectedZone.properties.id, (f) => ({
                      ...f,
                      properties: { ...f.properties, layout: nextLayout },
                      geometry: rectToPolygon(nextLayout),
                    }));
                  }}
                />
              </label>
              <label>
                Поворот (°)
                <input
                  type="number"
                  step="0.1"
                  value={layout.rotation}
                  onChange={(e) => {
                    const rotation = clamp(Number(e.target.value), -180, 180);
                    const nextLayout = { ...layout, rotation };
                    updateZone(selectedZone.properties.id, (f) => ({
                      ...f,
                      properties: { ...f.properties, layout: nextLayout },
                      geometry: rectToPolygon(nextLayout),
                    }));
                  }}
                />
              </label>
              <div className="overlay-nudge-grid">
                <button type="button" className="btn-mini" onClick={() => {
                  const c = nudgeLatLng(layout.center.lat, layout.center.lng, 1, 0);
                  const nextLayout = { ...layout, center: c };
                  updateZone(selectedZone.properties.id, (f) => ({
                    ...f, properties: { ...f.properties, layout: nextLayout }, geometry: rectToPolygon(nextLayout),
                  }));
                }}>↑1м</button>
                <button type="button" className="btn-mini" onClick={() => {
                  const c = nudgeLatLng(layout.center.lat, layout.center.lng, 0, 1);
                  const nextLayout = { ...layout, center: c };
                  updateZone(selectedZone.properties.id, (f) => ({
                    ...f, properties: { ...f.properties, layout: nextLayout }, geometry: rectToPolygon(nextLayout),
                  }));
                }}>→1м</button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn-secondary btn-mini" onClick={convertZoneToRect}>
              Преобразовать в прямоугольник
            </button>
          )}
        </div>
      ) : null}

      {activeSelection && selectedPath ? (
        <div className="map-draw-props">
          <h3>Линия: {selectedPath.properties.name ?? selectedPath.properties.id}</h3>
          <div className="grid">
            <label>
              Название
              <input
                value={selectedPath.properties.name ?? ''}
                onChange={(e) =>
                  updatePath(selectedPath.properties.id, (f) => ({
                    ...f,
                    properties: { ...f.properties, name: e.target.value },
                  }))
                }
              />
            </label>
            <label>
              Тип
              <select
                value={selectedPath.properties.pathKind ?? 'road'}
                onChange={(e) =>
                  updatePath(selectedPath.properties.id, (f) => ({
                    ...f,
                    properties: { ...f.properties, pathKind: e.target.value as MapPathProperties['pathKind'] },
                  }))
                }
              >
                {Object.entries(PATH_KIND_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="map-draw-checkbox">
              <input
                type="checkbox"
                checked={selectedPath.properties.closed === true}
                onChange={(e) =>
                  updatePath(selectedPath.properties.id, (f) => ({
                    ...f,
                    properties: { ...f.properties, closed: e.target.checked },
                  }))
                }
              />
              Временно закрыта для маршрутов
            </label>
          </div>
        </div>
      ) : null}

      <form action={saveAction} className="map-draw-save">
        <input type="hidden" name="mapZones" value={JSON.stringify(zones)} />
        <input type="hidden" name="mapPaths" value={JSON.stringify(paths)} />
        <button type="submit" className="btn-primary" disabled={!dirty}>
          {dirty ? 'Сохранить слои карты' : 'Нет изменений'}
        </button>
        <span className="hint">
          Зон: {zones.features.length} · Линий: {paths.features.length}
        </span>
      <ContentRevision />
</form>
    </div>
  );
}
