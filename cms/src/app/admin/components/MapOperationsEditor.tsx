'use client';

import { ContentRevision } from './ContentRevision';
import { useMemo, useState } from 'react';
import type {
  FestivalMapConfig,
  MapPoiCategory,
  MapPoiProperties,
  MapPoisGeoJson,
  MapPathsGeoJson,
} from '@/types';

type PoiFeature = GeoJSON.Feature<GeoJSON.Point, MapPoiProperties>;

const CATEGORIES: { value: MapPoiCategory; label: string }[] = [
  { value: 'stage', label: 'Сцена' },
  { value: 'foodcourt', label: 'Фудкорт' },
  { value: 'toilet', label: 'Туалет' },
  { value: 'water', label: 'Вода' },
  { value: 'medical', label: 'Медпункт' },
  { value: 'security', label: 'Охрана' },
  { value: 'entrance', label: 'Вход' },
  { value: 'parking', label: 'Парковка' },
  { value: 'info', label: 'Информация' },
  { value: 'shower', label: 'Душ' },
  { value: 'custom', label: 'Другое' },
];

function distanceMeters(a: [number, number], b: [number, number]) {
  const lat = ((a[1] + b[1]) / 2) * Math.PI / 180;
  return Math.hypot((a[0] - b[0]) * Math.cos(lat) * 111_320, (a[1] - b[1]) * 111_320);
}

function distanceToSegmentMeters(
  point: [number, number],
  start: [number, number],
  end: [number, number],
) {
  const lat = point[1] * Math.PI / 180;
  const scaleX = Math.cos(lat) * 111_320;
  const px = point[0] * scaleX;
  const py = point[1] * 111_320;
  const ax = start[0] * scaleX;
  const ay = start[1] * 111_320;
  const bx = end[0] * scaleX;
  const by = end[1] * 111_320;
  const lengthSquared = (bx - ax) ** 2 + (by - ay) ** 2;
  if (lengthSquared === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / lengthSquared));
  return Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)));
}

function graphComponentCount(paths: MapPathsGeoJson) {
  const endpoints = paths.features
    .filter((path) => path.properties.pathKind !== 'fence' && !path.properties.closed)
    .map((path) => {
      const coordinates = path.geometry.coordinates as [number, number][];
      return [coordinates[0], coordinates[coordinates.length - 1]] as const;
    });
  if (!endpoints.length) return 0;
  const parent = endpoints.map((_, index) => index);
  const find = (value: number): number => parent[value] === value ? value : (parent[value] = find(parent[value]));
  for (let a = 0; a < endpoints.length; a += 1) {
    for (let b = a + 1; b < endpoints.length; b += 1) {
      if (endpoints[a].some((x) => endpoints[b].some((y) => distanceMeters(x, y) <= 3))) {
        const rootA = find(a);
        const rootB = find(b);
        if (rootA !== rootB) parent[rootB] = rootA;
      }
    }
  }
  return new Set(endpoints.map((_, index) => find(index))).size;
}

export function MapOperationsEditor({
  config,
  initialPois,
  paths,
  saveAction,
}: {
  config: FestivalMapConfig;
  initialPois: MapPoisGeoJson;
  paths: MapPathsGeoJson;
  saveAction: (formData: FormData) => void | Promise<void>;
}) {
  const [pois, setPois] = useState<PoiFeature[]>(initialPois.features as PoiFeature[]);
  const routablePaths = useMemo(
    () => paths.features.filter((path) => path.properties.pathKind !== 'fence' && !path.properties.closed),
    [paths.features],
  );
  const validation = useMemo(() => {
    const segments = routablePaths.flatMap((path) => {
      const coordinates = path.geometry.coordinates as [number, number][];
      return coordinates.slice(0, -1).map((start, index) => [start, coordinates[index + 1]] as const);
    });
    return {
      components: graphComponentCount(paths),
      farPois: pois.filter((poi) => {
        const coordinate = poi.properties.accessPoint
          ? [poi.properties.accessPoint.lng, poi.properties.accessPoint.lat] as [number, number]
          : poi.geometry.coordinates as [number, number];
        return !segments.length || Math.min(
          ...segments.map(([start, end]) => distanceToSegmentMeters(coordinate, start, end)),
        ) > 25;
      }),
    };
  }, [paths, pois, routablePaths]);

  const update = (
    index: number,
    patch: Partial<PoiFeature['properties']> & { lat?: number; lng?: number },
  ) => {
    setPois((current) => current.map((poi, currentIndex) => {
      if (currentIndex !== index) return poi;
      const lng = patch.lng ?? poi.geometry.coordinates[0];
      const lat = patch.lat ?? poi.geometry.coordinates[1];
      const { lng: _lng, lat: _lat, ...properties } = patch;
      return {
        ...poi,
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: { ...poi.properties, ...properties },
      };
    }));
  };

  const addPoi = () => {
    const id = `poi-${Date.now()}`;
    setPois((current) => [...current, {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [config.center.lng, config.center.lat] },
      properties: {
        id,
        name: 'Новая точка',
        category: 'info',
        status: 'open',
        link: { type: 'none' },
      },
    }]);
  };

  const collection: MapPoisGeoJson = { type: 'FeatureCollection', features: pois };
  const walkwayCount = routablePaths.filter((path) => path.properties.pathKind === 'walkway').length;

  return (
    <section className="panel map-operations">
      <div className="panel-heading">
        <div>
          <h2>Точки и проверка маршрутов</h2>
          <p>Исправьте красные предупреждения до публикации карты.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={addPoi}>+ Добавить точку</button>
      </div>
      <div className="map-validation-grid">
        <div className={validation.components <= 1 ? 'map-check map-check-ok' : 'map-check map-check-error'}>
          <strong>{validation.components}</strong><span>связных сетей</span>
        </div>
        <div className={validation.farPois.length === 0 ? 'map-check map-check-ok' : 'map-check map-check-error'}>
          <strong>{validation.farPois.length}</strong><span>точек далеко от троп</span>
        </div>
        <div className={walkwayCount > 0 ? 'map-check map-check-ok' : 'map-check map-check-error'}>
          <strong>{walkwayCount}</strong><span>пешеходных троп</span>
        </div>
      </div>
      {validation.components > 1 ? (
        <p className="map-validation-error">Сеть разорвана. Соедините концы дорожек с точностью до 3 м — приложение не будет рисовать мост через поле.</p>
      ) : null}
      {validation.farPois.length ? (
        <p className="map-validation-error">Укажите вход у дорожки: {validation.farPois.map((poi) => poi.properties.name).join(', ')}.</p>
      ) : null}
      <div className="map-poi-list">
        {pois.map((poi, index) => (
          <div className="map-poi-row" key={poi.properties.id}>
            <input aria-label="Название точки" value={poi.properties.name} onChange={(event) => update(index, { name: event.target.value })} />
            <select aria-label="Категория точки" value={poi.properties.category} onChange={(event) => update(index, { category: event.target.value as MapPoiCategory })}>
              {CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
            </select>
            <input aria-label="Широта" type="number" step="0.000001" value={poi.geometry.coordinates[1]} onChange={(event) => update(index, { lat: Number(event.target.value) })} />
            <input aria-label="Долгота" type="number" step="0.000001" value={poi.geometry.coordinates[0]} onChange={(event) => update(index, { lng: Number(event.target.value) })} />
            <select aria-label="Статус точки" value={poi.properties.status ?? 'unknown'} onChange={(event) => update(index, { status: event.target.value as MapPoiProperties['status'] })}>
              <option value="open">Открыто</option>
              <option value="closed">Закрыто</option>
              <option value="unknown">Не указан</option>
            </select>
            <button type="button" className="btn-danger" onClick={() => setPois((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Удалить</button>
          </div>
        ))}
      </div>
      <form action={saveAction}>
        <input type="hidden" name="mapPois" value={JSON.stringify(collection)} />
        <button type="submit" className="btn-primary">Сохранить точки карты</button>
      <ContentRevision />
</form>
    </section>
  );
}
