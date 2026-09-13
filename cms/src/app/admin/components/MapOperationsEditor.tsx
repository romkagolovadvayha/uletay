'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildGraph, findInternalPathAsync } from '../../../../../src/utils/map/pathfinding';
import { visitorPathFeatures } from '../../../../../src/utils/map/fenceRouting';
import { zoneTargetPoint } from '../../../../../src/utils/map/zoneGeo';
import { formatDistance, formatDuration } from '../../../../../src/utils/map/geo-math';
import { selectionFeature, type MapSelection } from '@/lib/admin-map-model';
import type { MapPathsGeoJson, MapPoisGeoJson, MapZonesGeoJson } from '@/types';
import type { RouteSegment } from '../../../../../src/types/map';

export function MapOperationsEditor({
  zones,
  paths,
  pois,
  selection,
  onRoute,
}: {
  zones: MapZonesGeoJson;
  paths: MapPathsGeoJson;
  pois: MapPoisGeoJson;
  selection: MapSelection;
  onRoute: (route: RouteSegment[] | undefined) => void;
}) {
  const entrances = pois.features.filter(
    (p) => p.properties.category === 'entrance' && p.properties.status !== 'closed',
  );
  const [entranceId, setEntranceId] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const validation = useMemo(() => {
    const visitor = { type: 'FeatureCollection' as const, features: visitorPathFeatures(paths, zones) };
    const { nodes, adjacency } = buildGraph(visitor, 3);
    const visited = new Set<string>();
    let components = 0;
    for (const node of nodes.keys()) {
      if (visited.has(node)) continue;
      components++;
      const queue = [node];
      visited.add(node);
      while (queue.length)
        for (const edge of adjacency.get(queue.pop()!) ?? [])
          if (!visited.has(edge.to)) {
            visited.add(edge.to);
            queue.push(edge.to);
          }
    }
    return { components, paths: visitor.features.length };
  }, [zones, paths]);
  const selected = selectionFeature(selection, zones, paths, pois);
  const restricted =
    selected && (('accessRestricted' in selected.properties && selected.properties.accessRestricted) || ('status' in selected.properties && selected.properties.status === 'closed'));

  useEffect(() => {
    // Invalidate the async route result when the user edits its graph or destination.
    generation.current++;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult('');
    setBusy(false);
    onRoute(undefined);
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps -- generation is an async request token, not a DOM ref
      generation.current++;
    };
  }, [zones, paths, pois, selection, entranceId, onRoute]);

  async function checkRoute() {
    if (!selected || selection?.kind === 'path') return;
    const entrance = entrances.find((p) => p.properties.id === entranceId) ?? entrances[0];
    if (!entrance) return;
    const run = ++generation.current;
    setBusy(true);
    setResult('');
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
    try {
      const from = entrance.properties.accessPoint ?? {
        lng: entrance.geometry.coordinates[0],
        lat: entrance.geometry.coordinates[1],
      };
      const target =
        selected.geometry.type === 'Polygon'
          ? zoneTargetPoint(selected as MapZonesGeoJson['features'][number])
          : (('accessPoint' in selected.properties ? selected.properties.accessPoint : undefined) ?? {
              lng: (selected.geometry as GeoJSON.Point).coordinates[0],
              lat: (selected.geometry as GeoJSON.Point).coordinates[1],
            });
      const route = restricted ? null : await findInternalPathAsync(paths, from, target, zones);
      if (run !== generation.current) return;
      setResult(
        route
          ? `${formatDistance(route.distanceMeters)} · ${formatDuration(route.durationSeconds)} пешком. Маршрут показан на карте.`
          : 'Маршрут недоступен. Проверьте вход у дорожки, соединения дорог и закрытые зоны.',
      );
      onRoute(route ? [{ ...route, kind: 'internal' }] : undefined);
    } catch {
      if (run === generation.current) setResult('Не удалось проверить маршрут. Проверьте геометрию дорожек.');
    } finally {
      if (run === generation.current) setBusy(false);
    }
  }

  return (
    <details id="map-navigation" className="advanced-panel map-route-check">
      <summary>
        Проверка навигации · {validation.components}{' '}
        {validation.components === 1 ? 'связная сеть' : 'отдельных сетей'}
      </summary>
      <p className="hint">
        {validation.paths} участков для посетителей. Учитываются пересечения дорожек, закрытые участки и
        заборы — по алгоритму приложения.
      </p>
      {validation.components > 1 && (
        <p className="map-validation-error">
          Есть отдельные сети дорожек. Проверьте маршрут к нужному объекту: число сетей само по себе не
          определяет его доступность.
        </p>
      )}
      <div className="map-route-controls">
        <label>
          Начальная точка
          <select
            value={entrances.some(p => p.properties.id === entranceId) ? entranceId : entrances[0]?.properties.id || ''}
            onChange={(e) => setEntranceId(e.target.value)}
          >
            {entrances.map((p) => (
              <option key={p.properties.id} value={p.properties.id}>
                {p.properties.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn-secondary"
          disabled={
            busy || !entrances.length || !selected || selection?.kind === 'path' || Boolean(restricted)
          }
          onClick={() => void checkRoute()}
        >
          {busy ? 'Проверяем…' : 'Проверить маршрут к выбранному объекту'}
        </button>
      </div>
      <p className="hint">
        {restricted
          ? 'Объект закрыт для посетителей.'
          : !entrances.length
            ? 'Добавьте открытую точку категории «Вход / КПП».'
            : !selected || selection?.kind === 'path'
              ? 'Выберите здание или точку на карте.'
              : `Назначение: ${selected.properties.name}`}
      </p>
      {result && (
        <p role="status" className="map-route-result">
          {result}
        </p>
      )}
    </details>
  );
}
