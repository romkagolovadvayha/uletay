'use client';

import { matchesAdminSearch } from '@/lib/admin-navigation';

import { ContentRevision } from './ContentRevision';
import { AdminMapCanvas, type MapHandle } from './AdminMapCanvas';
import { MapLeaveGuard } from './MapLeaveGuard';
import { MapOperationsEditor } from './MapOperationsEditor';
import { SubmitButton } from './EditorForm';
import {
  editZoneVertex,
  moveZone,
  transformZone,
  transformCoordinate,
  transformZoneGroup,
  featureCenter,
  selectionFeature,
  POI_CATEGORIES,
  type Coordinate,
  type MapSelection,
} from '@/lib/admin-map-model';
import { polygonLabelLayout } from '../../../../../src/utils/map/polygonLabelLayout';
import type { RouteSegment } from '../../../../../src/types/map';
import { buildingHeight } from '../../../../../src/utils/map/buildingHeight';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { defaultZoneProps, PATH_KIND_LABELS, type DrawTool, ZONE_TYPE_LABELS } from '@/lib/map-draw-styles';
import {
  closeRing,
  newMapId,
  nudgeLatLng,
  openRing,
  rectToPolygon,
  translateCoords,
  type RectLayout,
} from '@/lib/map-geometry';
import { useMapEditorHistory } from '@/lib/use-map-editor-history';
import { useLatestRef } from '@/hooks/useLatestRef';
import type {
  FestivalMapConfig,
  MapAdminOverlay,
  MapPathProperties,
  MapPathsGeoJson,
  MapZoneProperties,
  MapPoisGeoJson,
  MapZoneType,
  MapZonesGeoJson,
} from '@/types';

type Props = {
  config: FestivalMapConfig;
  zones: MapZonesGeoJson;
  paths: MapPathsGeoJson;
  pois: MapPoisGeoJson;
  overlay?: MapAdminOverlay;
  saveAction: (formData: FormData) => void | Promise<void>;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function MapDrawEditor({
  config,
  zones: initialZones,
  paths: initialPaths,
  pois: initialPois,
  overlay,
  saveAction,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [routes, setRoutes] = useState<RouteSegment[]>();
  const [preview, setPreview] = useState(false);
  const [helpers, setHelpers] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [focus, setFocus] = useState<{
    coordinates: Coordinate;
    token: number;
    bounds?: [Coordinate, Coordinate];
  }>();
  const [pickingAccess, setPickingAccess] = useState(false);
  const [notice, setNotice] = useState('');
  const [tool, setTool] = useState<DrawTool>('select');
  const [newZoneType, setNewZoneType] = useState<MapZoneType>('building');
  const [newPathKind, setNewPathKind] = useState<MapPathProperties['pathKind']>('road');
  const [selection, setSelection] = useState<MapSelection>(null);
  const [draftCoords, setDraftCoords] = useState<[number, number][]>([]);
  const { zones, paths, pois, setZones, setPaths, setPois, setLayers, undo, redo, canUndo, canRedo } =
    useMapEditorHistory({
      zones: initialZones,
      paths: initialPaths,
      pois: initialPois,
    });
  const [submitted, setSubmitted] = useState(false);
  const zonesJson = useMemo(() => JSON.stringify(zones), [zones]);
  const pathsJson = useMemo(() => JSON.stringify(paths), [paths]);
  const poisJson = useMemo(() => JSON.stringify(pois), [pois]);
  const initialJson = useMemo(
    () => [JSON.stringify(initialZones), JSON.stringify(initialPaths), JSON.stringify(initialPois)],
    [initialZones, initialPaths, initialPois],
  );
  const dirty = zonesJson !== initialJson[0] || pathsJson !== initialJson[1] || poisJson !== initialJson[2];
  const [zoneImageUploading, setZoneImageUploading] = useState(false);

  const markDirty = useCallback(() => setSubmitted(false), []);

  const selectObject = useCallback(
    (kind: NonNullable<MapSelection>['kind'], id: string) => {
      setSelection({ kind, id });
      setPickingAccess(false);
      setTool('select');
      setDraftCoords([]);
      const feature = selectionFeature({ kind, id }, zones, paths, pois);
      if (feature) {
        const points =
          feature.geometry.type === 'Polygon'
            ? feature.geometry.coordinates.flat()
            : feature.geometry.type === 'LineString'
              ? feature.geometry.coordinates
              : [];
        setFocus({
          coordinates: featureCenter(feature),
          token: Date.now(),
          bounds: points.length
            ? [
                [Math.min(...points.map((c) => c[0])), Math.min(...points.map((c) => c[1]))],
                [Math.max(...points.map((c) => c[0])), Math.max(...points.map((c) => c[1]))],
              ]
            : undefined,
        });
      }
    },
    [zones, paths, pois],
  );

  const activeSelection = selection;

  const selectedZone = useMemo(
    () =>
      activeSelection?.kind === 'zone'
        ? zones.features.find((f) => f.properties.id === activeSelection.id)
        : undefined,
    [activeSelection, zones],
  );
  const selectedPath = useMemo(
    () =>
      activeSelection?.kind === 'path'
        ? paths.features.find((f) => f.properties.id === activeSelection.id)
        : undefined,
    [activeSelection, paths],
  );

  const selectedPoi =
    selection?.kind === 'poi' ? pois.features.find((f) => f.properties.id === selection.id) : undefined;
  const updateZone = useCallback(
    (
      id: string,
      updater: (
        z: GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>,
      ) => GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>,
    ) => {
      setLayers((prev) => {
        const old = prev.zones.features.find((f) => f.properties.id === id);
        if (!old) return prev;
        const next = updater(old);
        const accessChanged = next.properties.accessPoint !== old.properties.accessPoint;
        return {
          ...prev,
          zones: {
            ...prev.zones,
            features: prev.zones.features.map((f) => (f.properties.id === id ? next : f)),
          },
          pois: accessChanged
            ? {
                ...prev.pois,
                features: prev.pois.features.map((f) =>
                  f.properties.sourceZoneId === id
                    ? { ...f, properties: { ...f.properties, accessPoint: next.properties.accessPoint } }
                    : f,
                ),
              }
            : prev.pois,
        };
      });
      markDirty();
    },
    [markDirty, setLayers],
  );

  const updatePath = useCallback(
    (
      id: string,
      updater: (
        p: GeoJSON.Feature<GeoJSON.LineString, MapPathProperties>,
      ) => GeoJSON.Feature<GeoJSON.LineString, MapPathProperties>,
    ) => {
      setPaths((prev) => ({
        ...prev,
        features: prev.features.map((f) => (f.properties.id === id ? updater(f) : f)),
      }));
      markDirty();
    },
    [markDirty, setPaths],
  );

  const moveZoneGroup = useCallback(
    (id: string, delta: Coordinate) => {
      setLayers((prev) => ({
        ...prev,
        ...transformZoneGroup(
          prev.zones,
          prev.pois!,
          id,
          (f) => moveZone(f, delta),
          (c) => [c[0] + delta[0], c[1] + delta[1]],
        ),
      }));
      markDirty();
    },
    [setLayers, markDirty],
  );
  const rotateZoneGroup = (zone: MapZonesGeoJson['features'][number], angle: number, scale = 1) => {
    const center = featureCenter(zone);
    setLayers((prev) => ({
      ...prev,
      ...transformZoneGroup(
        prev.zones,
        prev.pois!,
        zone.properties.id,
        (f) => transformZone(f, angle, scale, center),
        (c) => transformCoordinate(c, center, angle, scale),
      ),
    }));
    markDirty();
  };

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
        setNotice(message);
      } finally {
        setZoneImageUploading(false);
      }
    },
    [updateZone],
  );

  const deleteSelection = useCallback(() => {
    if (!activeSelection) return;
    if (
      activeSelection.kind === 'zone' &&
      zones.features.some((f) => f.properties.parentZoneId === activeSelection.id)
    ) {
      setNotice('Внутри зоны есть отдельные места. Сначала перенесите или удалите их.');
      return;
    }
    if (activeSelection.kind === 'zone') {
      // Remove associated POI records together, avoiding an orphan duplicate marker.
      setLayers((prev) => ({
        ...prev,
        zones: {
          ...prev.zones,
          features: prev.zones.features.filter((f) => f.properties.id !== activeSelection.id),
        },
        pois: {
          type: 'FeatureCollection',
          features: (prev.pois?.features ?? []).filter(
            (f) => f.properties.sourceZoneId !== activeSelection.id,
          ),
        },
      }));
    } else if (activeSelection.kind === 'path')
      setPaths((prev) => ({
        ...prev,
        features: prev.features.filter((f) => f.properties.id !== activeSelection.id),
      }));
    else
      setPois((prev) => ({
        ...prev,
        features: prev.features.filter((f) => f.properties.id !== activeSelection.id),
      }));
    setSelection(null);
    markDirty();
  }, [activeSelection, zones, markDirty, setLayers, setPaths, setPois]);

  const duplicateSelection = useCallback(() => {
    if (!selection) return;
    const source = selectionFeature(selection, zones, paths, pois);
    if (!source) return;
    const center = featureCenter(source),
      shifted = nudgeLatLng(center[1], center[0], 0, 8);
    const delta: Coordinate = [shifted.lng - center[0], shifted.lat - center[1]];
    const id = newMapId(selection.kind);
    if (selection.kind === 'zone') {
      const original = zones.features.find((f) => f.properties.id === selection.id)!;
      const copy = moveZone(original, delta);
      setZones((prev) => ({
        ...prev,
        features: [
          ...prev.features,
          { ...copy, properties: { ...copy.properties, id, name: copy.properties.name + ' — копия' } },
        ],
      }));
    } else if (selection.kind === 'path') {
      const original = paths.features.find((f) => f.properties.id === selection.id)!;
      setPaths((prev) => ({
        ...prev,
        features: [
          ...prev.features,
          {
            ...original,
            properties: { ...original.properties, id },
            geometry: {
              type: 'LineString',
              coordinates: translateCoords(original.geometry.coordinates as Coordinate[], ...delta),
            },
          },
        ],
      }));
    } else {
      const original = pois.features.find((f) => f.properties.id === selection.id)!;
      setPois((prev) => ({
        ...prev,
        features: [
          ...prev.features,
          {
            ...original,
            properties: {
              ...original.properties,
              id,
              name: original.properties.name + ' — копия',
              sourceZoneId: undefined,
              accessPoint: undefined,
            },
            geometry: { type: 'Point', coordinates: [shifted.lng, shifted.lat] },
          },
        ],
      }));
    }
    setSelection({ kind: selection.kind, id });
    markDirty();
  }, [selection, zones, paths, pois, setZones, setPaths, setPois, markDirty]);

  const finishDraft = useCallback(() => {
    if (draftCoords.length < (tool === 'polygon' ? 3 : 2)) return;
    if (tool === 'line') {
      const id = newMapId('path');
      setPaths((prev) => ({
        ...prev,
        features: [
          ...prev.features,
          {
            type: 'Feature',
            properties: {
              id,
              name: PATH_KIND_LABELS[newPathKind ?? 'road'],
              pathKind: newPathKind ?? 'road',
            },
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
    (coordinates: Coordinate) => {
      const [lng, lat] = coordinates;
      if (tool === 'poi') {
        const id = newMapId('poi');
        setPois((prev) => ({
          ...prev,
          features: [
            ...prev.features,
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates },
              properties: {
                id,
                name: 'Новая точка',
                category: 'info',
                status: 'open',
                link: { type: 'none' },
              },
            },
          ],
        }));
        setSelection({ kind: 'poi', id });
        setTool('select');
        markDirty();
        return;
      }
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
    [tool, newZoneType, markDirty, setZones, setPois],
  );

  const toolRef = useLatestRef(tool);
  const finishDraftRef = useLatestRef(finishDraft);
  const deleteSelectionRef = useLatestRef(deleteSelection);
  const undoRef = useLatestRef(undo);
  const redoRef = useLatestRef(redo);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        !editorRef.current?.contains(e.target as Node) ||
        preview ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return;
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
        setPickingAccess(false);
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
        '5': 'poi',
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
  }, [preview, draftCoords.length, markDirty, deleteSelectionRef, finishDraftRef, redoRef, toolRef, undoRef]);

  const setAccessPoint = useCallback(
    (coordinate: Coordinate) => {
      const accessPoint = { lng: coordinate[0], lat: coordinate[1] };
      const zoneId = selectedZone?.properties.id ?? selectedPoi?.properties.sourceZoneId;
      const poiId = selectedPoi?.properties.id;
      setLayers((prev) => ({
        ...prev,
        zones: {
          ...prev.zones,
          features: prev.zones.features.map((f) =>
            f.properties.id === zoneId
              ? { ...f, properties: { ...f.properties, accessPoint, accessPointGenerated: false } }
              : f,
          ),
        },
        pois: {
          ...prev.pois,
          features: prev.pois.features.map((f) =>
            f.properties.id === poiId || (zoneId && f.properties.sourceZoneId === zoneId)
              ? { ...f, properties: { ...f.properties, accessPoint } }
              : f,
          ),
        },
      }));
      setPickingAccess(false);
      markDirty();
    },
    [selectedZone, selectedPoi, setLayers, markDirty],
  );

  const layout = selectedZone?.properties.layout;
  const handles = useMemo<MapHandle[]>(() => {
    if (tool !== 'select' || pickingAccess) return [];
    const result: MapHandle[] = [];
    const selected = selectedZone ?? selectedPath ?? selectedPoi;
    if (!selected) return result;
    const origin = featureCenter(selected);
    result.push({
      id: 'move',
      coordinate: origin,
      title: 'Перетащить объект',
      onCommit: (coordinate) => {
        const delta: Coordinate = [coordinate[0] - origin[0], coordinate[1] - origin[1]];
        if (selectedZone) moveZoneGroup(selectedZone.properties.id, delta);
        else if (selectedPath)
          updatePath(selectedPath.properties.id, (f) => ({
            ...f,
            geometry: {
              type: 'LineString',
              coordinates: translateCoords(f.geometry.coordinates as Coordinate[], ...delta),
            },
          }));
        else if (selectedPoi) {
          setPois((prev) => ({
            ...prev,
            features: prev.features.map((f) =>
              f.properties.id === selectedPoi.properties.id
                ? { ...f, geometry: { type: 'Point', coordinates: coordinate } }
                : f,
            ),
          }));
          markDirty();
        }
      },
    });
    if (selectedZone && !selectedZone.properties.layout)
      openRing(selectedZone.geometry.coordinates[0] as Coordinate[]).forEach((coordinate, index) => {
        result.push({
          id: `vertex-${index}`,
          coordinate,
          title: `Вершина ${index + 1}`,
          kind: 'vertex',
          onCommit: (c) => updateZone(selectedZone.properties.id, (f) => editZoneVertex(f, index, c)),
        });
      });
    if (selectedPath)
      selectedPath.geometry.coordinates.forEach((coordinate, index) => {
        result.push({
          id: `vertex-${index}`,
          coordinate: coordinate as Coordinate,
          title: `Вершина ${index + 1}`,
          kind: 'vertex',
          onCommit: (c) =>
            updatePath(selectedPath.properties.id, (f) => ({
              ...f,
              geometry: {
                type: 'LineString',
                coordinates: f.geometry.coordinates.map((point, i) => (i === index ? c : point)),
              },
            })),
        });
      });
    const access = (selectedZone ?? selectedPoi)?.properties.accessPoint;
    if (access)
      result.push({
        id: 'access',
        coordinate: [access.lng, access.lat],
        title: 'Вход для маршрута',
        kind: 'access',
        onCommit: setAccessPoint,
      });
    return result;
  }, [
    selectedZone,
    selectedPath,
    selectedPoi,
    tool,
    pickingAccess,
    updateZone,
    updatePath,
    moveZoneGroup,
    setAccessPoint,
    setPois,
    markDirty,
  ]);

  const layerItems = useMemo(() => {
    const items: { kind: 'zone' | 'path' | 'poi'; id: string; label: string; group: string }[] = [];
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
    for (const f of pois.features)
      items.push({
        kind: 'poi',
        id: f.properties.id,
        label: f.properties.name,
        group: POI_CATEGORIES[f.properties.category],
      });
    return items;
  }, [zones, paths, pois]);

  const [layerQuery, setLayerQuery] = useState('');
  const visibleLayers = layerItems.filter((item) => matchesAdminSearch(layerQuery, item.label, item.group));

  return (
    <div ref={editorRef} className="panel map-draw-editor" tabIndex={-1}>
      <MapLeaveGuard dirty={dirty && !submitted} />
      <div className="panel-heading">
        <div>
          <h2>Карта фестиваля</h2>
          <p>Объекты, дороги и входы — на той же карте, что видят гости.</p>
        </div>
        <span className="map-engine-badge">MapLibre · как на сайте</span>
      </div>
      <div className="map-view-toolbar">
        <div className="map-mode-switch" aria-label="Режим карты">
          <button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}>
            Редактирование · 2D
          </button>
          <button
            type="button"
            aria-pressed={preview}
            onClick={() => {
              setPreview(true);
              setPickingAccess(false);
            }}
          >
            Вид для гостей · 3D
          </button>
        </div>
        {!preview && (
          <label>
            <input type="checkbox" checked={helpers} onChange={(e) => setHelpers(e.target.checked)} />
            Служебные линии и закрытые зоны
          </label>
        )}
        {overlay && !preview && (
          <label>
            <input type="checkbox" checked={showOverlay} onChange={(e) => setShowOverlay(e.target.checked)} />
            Схема-образец
          </label>
        )}
      </div>
      {notice && (
        <p role="alert" className="notice error">
          {notice}
        </p>
      )}
      <details className="map-editor-help" hidden={preview}>
        <summary>Как редактировать карту</summary>
        <p className="hint">
          Прямоугольник — здания, линия — дороги/заборы, полигон — зоны. Выделите объект и перетащите жёлтый
          маркер в центре; синие точки — вершины для изменения формы. Клавиши 1–5 — инструменты, Enter —
          завершить линию/полигон, Del — удалить, Esc — отмена, Ctrl+Z / Ctrl+Y — отмена/повтор.
        </p>
      </details>

      <div className="map-draw-toolbar" hidden={preview}>
        {(
          [
            ['select', 'Выбор (1)'],
            ['rect', 'Прямоугольник (2)'],
            ['line', 'Линия (3)'],
            ['polygon', 'Полигон (4)'],
            ['poi', 'Точка (5)'],
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

        {(tool === 'line' || tool === 'polygon') && draftCoords.length >= (tool === 'polygon' ? 3 : 2) ? (
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

        <button
          type="button"
          className="btn-secondary btn-mini"
          disabled={!canUndo}
          onClick={() => {
            undo();
            markDirty();
          }}
        >
          ↶ Отмена
        </button>
        <button
          type="button"
          className="btn-secondary btn-mini"
          disabled={!canRedo}
          onClick={() => {
            redo();
            markDirty();
          }}
        >
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
          <AdminMapCanvas
            config={config}
            zones={zones}
            paths={paths}
            pois={pois}
            overlay={preview || showOverlay ? overlay : undefined}
            selection={selection}
            handles={handles}
            draft={draftCoords}
            drawing={tool !== 'select' || pickingAccess}
            helpers={helpers}
            preview={preview}
            focus={focus}
            routes={routes}
            onClick={(coordinate, hit) => {
              editorRef.current?.focus({ preventScroll: true });
              if (pickingAccess) {
                setAccessPoint(coordinate);
              } else if (tool !== 'select') handleMapClick(coordinate);
              else setSelection(hit);
            }}
          />
          <p className="map-canvas-hint" role="status">
            {preview
              ? 'Предпросмотр опубликованного вида. Для изменения объектов вернитесь в 2D.'
              : pickingAccess
                ? 'Нажмите на дорожку у входа в объект. Esc — отмена.'
                : tool === 'select'
                  ? 'Выберите объект на карте или в списке. Жёлтая ручка — перемещение, зелёная — вход, синие — вершины.'
                  : tool === 'rect'
                    ? 'Нажмите на карту, чтобы разместить здание.'
                    : tool === 'poi'
                      ? 'Нажмите на карту, чтобы добавить точку.'
                      : 'Отметьте точки на карте и нажмите «Завершить». Esc — отмена.'}
          </p>
        </div>

        <aside className="map-draw-sidebar">
          <h3>
            Объекты ({visibleLayers.length} из {layerItems.length})
          </h3>
          <label className="map-layer-search">
            Найти объект
            <input
              type="search"
              value={layerQuery}
              onChange={(event) => setLayerQuery(event.target.value)}
              placeholder="Сцена, туалет, парковка…"
            />
          </label>
          <ul className="map-layer-list">
            {visibleLayers.length === 0 ? (
              <li className="map-layer-empty">
                {layerQuery ? 'Объекты не найдены' : 'Нет объектов — нарисуйте на карте'}
              </li>
            ) : (
              visibleLayers.map((item) => {
                const active = activeSelection?.kind === item.kind && activeSelection.id === item.id;
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

      {!preview && activeSelection && selectedZone ? (
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
            <label>
              Цвет объекта
              <input
                type="color"
                value={selectedZone.properties.fillColor}
                onChange={(e) =>
                  updateZone(selectedZone.properties.id, (f) => ({
                    ...f,
                    properties: { ...f.properties, fillColor: e.target.value },
                  }))
                }
              />
            </label>
            <label>
              Непрозрачность
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={selectedZone.properties.fillOpacity}
                onChange={(e) =>
                  updateZone(selectedZone.properties.id, (f) => ({
                    ...f,
                    properties: { ...f.properties, fillOpacity: Number(e.target.value) },
                  }))
                }
              />
            </label>
            <p className="hint">
              Объём: {buildingHeight(selectedZone.properties)} м. Высота зависит от типа объекта. Подпись
              автоматически вписывается в его границы, как на сайте.
            </p>
            <label className="map-draw-checkbox">
              <input
                type="checkbox"
                checked={selectedZone.properties.accessRestricted === true}
                onChange={(e) =>
                  updateZone(selectedZone.properties.id, (f) => ({
                    ...f,
                    properties: { ...f.properties, accessRestricted: e.target.checked },
                  }))
                }
              />
              Закрыто для посетителей
            </label>
          </div>
          <details className="map-zone-image-controls">
            <summary>Изображение на объекте</summary>
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
                      properties: {
                        ...f.properties,
                        fillImageUrl: undefined,
                        fillImageOpacity: undefined,
                        fillImageRotation: undefined,
                      },
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
                      selectedZone.properties.fillImageRotation ?? polygonLabelLayout(selectedZone).rotation,
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
              <p className="hint">
                Изображение размещается поверх объекта. Его поворот и прозрачность можно настроить.
              </p>
            )}
          </details>
          <div className="map-transform-tools">
            <span className="hint">Точный сдвиг:</span>
            {(
              [
                [1, 0, '↑ 1 м'],
                [0, -1, '← 1 м'],
                [-1, 0, '↓ 1 м'],
                [0, 1, '→ 1 м'],
              ] as const
            ).map(([north, east, label]) => (
              <button
                key={label}
                type="button"
                className="btn-secondary btn-mini"
                onClick={() => {
                  const center = featureCenter(selectedZone),
                    next = nudgeLatLng(center[1], center[0], north, east);
                  moveZoneGroup(selectedZone.properties.id, [next.lng - center[0], next.lat - center[1]]);
                }}
              >
                {label}
              </button>
            ))}
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
                Длина (м)
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
            </div>
          ) : (
            <div className="map-transform-tools">
              <span className="hint">Поворот и масштаб с сохранением формы:</span>
              <button
                type="button"
                className="btn-secondary btn-mini"
                onClick={() => rotateZoneGroup(selectedZone, 5, 1)}
              >
                ↶ 5°
              </button>
              <button
                type="button"
                className="btn-secondary btn-mini"
                onClick={() => rotateZoneGroup(selectedZone, -5, 1)}
              >
                ↷ 5°
              </button>
              <button
                type="button"
                className="btn-secondary btn-mini"
                onClick={() => rotateZoneGroup(selectedZone, 0, 0.95)}
              >
                Уменьшить на 5%
              </button>
              <button
                type="button"
                className="btn-secondary btn-mini"
                onClick={() => rotateZoneGroup(selectedZone, 0, 1.05)}
              >
                Увеличить на 5%
              </button>
            </div>
          )}
        </div>
      ) : null}

      {!preview && activeSelection && selectedPath ? (
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
                    properties: {
                      ...f.properties,
                      pathKind: e.target.value as MapPathProperties['pathKind'],
                    },
                  }))
                }
              >
                {Object.entries(PATH_KIND_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="map-draw-checkbox">
              <input
                type="checkbox"
                checked={selectedPath.properties.routingOnly === true}
                onChange={(e) =>
                  updatePath(selectedPath.properties.id, (f) => ({
                    ...f,
                    properties: { ...f.properties, routingOnly: e.target.checked },
                  }))
                }
              />
              Только для навигации (не рисовать дорогу)
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

      {!preview && selectedPoi && (
        <div className="map-draw-props">
          <h3>Точка: {selectedPoi.properties.name}</h3>
          <div className="grid">
            <label>
              Название точки
              <input
                value={selectedPoi.properties.name}
                onChange={(e) => {
                  setPois((prev) => ({
                    ...prev,
                    features: prev.features.map((f) =>
                      f.properties.id === selectedPoi.properties.id
                        ? { ...f, properties: { ...f.properties, name: e.target.value } }
                        : f,
                    ),
                  }));
                  markDirty();
                }}
              />
            </label>
            <label>
              Категория точки
              <select
                value={selectedPoi.properties.category}
                onChange={(e) => {
                  setPois((prev) => ({
                    ...prev,
                    features: prev.features.map((f) =>
                      f.properties.id === selectedPoi.properties.id
                        ? {
                            ...f,
                            properties: {
                              ...f.properties,
                              category: e.target.value as typeof f.properties.category,
                            },
                          }
                        : f,
                    ),
                  }));
                  markDirty();
                }}
              >
                {Object.entries(POI_CATEGORIES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Статус точки
              <select
                value={selectedPoi.properties.status ?? 'unknown'}
                onChange={(e) => {
                  setPois((prev) => ({
                    ...prev,
                    features: prev.features.map((f) =>
                      f.properties.id === selectedPoi.properties.id
                        ? {
                            ...f,
                            properties: {
                              ...f.properties,
                              status: e.target.value as typeof f.properties.status,
                            },
                          }
                        : f,
                    ),
                  }));
                  markDirty();
                }}
              >
                <option value="open">Открыто</option>
                <option value="closed">Закрыто</option>
                <option value="unknown">Не указан</option>
              </select>
            </label>
            {(['lng', 'lat'] as const).map((axis, index) => (
              <label key={axis}>
                {axis === 'lng' ? 'Долгота точки' : 'Широта точки'}
                <input
                  type="number"
                  step="0.000001"
                  value={Number(selectedPoi.geometry.coordinates[index].toFixed(6))}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (!Number.isFinite(value) || Math.abs(value) > (axis === 'lng' ? 180 : 85)) return;
                    setPois((prev) => ({
                      ...prev,
                      features: prev.features.map((f) =>
                        f.properties.id === selectedPoi.properties.id
                          ? {
                              ...f,
                              geometry: {
                                type: 'Point',
                                coordinates: f.geometry.coordinates.map((v, i) => (i === index ? value : v)),
                              },
                            }
                          : f,
                      ),
                    }));
                    markDirty();
                  }}
                />
              </label>
            ))}
            {selectedPoi.properties.sourceZoneId && (
              <p className="hint">
                Связана со зданием:{' '}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => selectObject('zone', selectedPoi.properties.sourceZoneId!)}
                >
                  Открыть объект
                </button>
                . На карте гостей отображается здание без дублирующей метки.
              </p>
            )}
          </div>
        </div>
      )}
      {!preview && (selectedZone || selectedPoi) && (
        <div className="map-access-controls">
          <button
            type="button"
            className="btn-secondary"
            aria-pressed={pickingAccess}
            onClick={() => setPickingAccess((v) => !v)}
          >
            {pickingAccess ? 'Отменить выбор входа' : 'Указать вход на карте'}
          </button>
          <span className="hint">
            Вход используется для маршрута и может находиться у дорожки отдельно от центра здания.
          </span>
        </div>
      )}
      <MapOperationsEditor
        zones={zones}
        paths={paths}
        pois={pois}
        selection={selection}
        onRoute={setRoutes}
      />
      <form
        action={async (formData) => {
          setSubmitted(true);
          try {
            await saveAction(formData);
          } finally {
            setSubmitted(false);
          }
        }}
        className="map-draw-save"
      >
        <input type="hidden" name="mapZones" value={zonesJson} />
        <input type="hidden" name="mapPaths" value={pathsJson} />
        <input type="hidden" name="mapPois" value={poisJson} />
        {dirty ? (
          <SubmitButton>Сохранить карту</SubmitButton>
        ) : (
          <button type="button" className="btn-primary" disabled>
            Нет изменений
          </button>
        )}
        <span className="hint" role="status">
          {dirty ? 'Есть несохранённые изменения · ' : ''}Зон: {zones.features.length} · Линий:{' '}
          {paths.features.length} · Точек: {pois.features.length}
        </span>
        <ContentRevision />
      </form>
    </div>
  );
}
