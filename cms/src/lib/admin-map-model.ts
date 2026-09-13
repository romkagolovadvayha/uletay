import type { MapPathsGeoJson, MapPoisGeoJson, MapZoneProperties, MapZonesGeoJson } from '@/types';
import { closeRing, openRing, ringCentroid } from './map-geometry';

export type MapSelection = { kind: 'zone' | 'path' | 'poi'; id: string } | null;
export type Coordinate = [number, number];
export const POI_CATEGORIES = {
  stage: 'Сцена',
  foodcourt: 'Кафе / еда',
  toilet: 'Туалет',
  shower: 'Душ',
  water: 'Вода',
  medical: 'Медпункт',
  security: 'Охрана / МЧС',
  entrance: 'Вход / КПП',
  parking: 'Парковка',
  info: 'Информация',
  custom: 'Другое',
} as const;

/** Move the complete object, including holes, split buildings and its visitor entrance. */
export function moveZone(zone: GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>, delta: Coordinate) {
  const move = ([lng, lat]: number[]) => [lng + delta[0], lat + delta[1]] as Coordinate;
  const polygon = (geometry: GeoJSON.Polygon): GeoJSON.Polygon => ({
    type: 'Polygon',
    coordinates: geometry.coordinates.map((r) => r.map(move)),
  });
  const p = zone.properties;
  return {
    ...zone,
    geometry: polygon(zone.geometry),
    properties: {
      ...p,
      geometryParts: p.geometryParts?.map(polygon),
      layoutRings: p.layoutRings?.map((r) => r.map(move)),
      layout: p.layout
        ? {
            ...p.layout,
            center: { lng: p.layout.center.lng + delta[0], lat: p.layout.center.lat + delta[1] },
          }
        : undefined,
      accessPoint: p.accessPoint
        ? { lng: p.accessPoint.lng + delta[0], lat: p.accessPoint.lat + delta[1] }
        : undefined,
    },
  };
}

export function editZoneVertex(
  zone: GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>,
  index: number,
  coordinate: Coordinate,
) {
  const ring = openRing(zone.geometry.coordinates[0] as Coordinate[]);
  ring[index] = coordinate;
  return {
    ...zone,
    properties: { ...zone.properties, layout: undefined },
    geometry: { ...zone.geometry, coordinates: [closeRing(ring), ...zone.geometry.coordinates.slice(1)] },
  };
}

/** Rotate/scale the real geometry; never replace a fitted polygon with a bounding rectangle. */
export function transformCoordinate(
  [lng, lat]: number[],
  center: Coordinate,
  rotation: number,
  scale = 1,
): Coordinate {
  const sx = 111320 * Math.cos((center[1] * Math.PI) / 180),
    angle = (rotation * Math.PI) / 180;
  const x = (lng - center[0]) * sx * scale,
    y = (lat - center[1]) * 111320 * scale;
  return [
    center[0] + (x * Math.cos(angle) - y * Math.sin(angle)) / sx,
    center[1] + (x * Math.sin(angle) + y * Math.cos(angle)) / 111320,
  ];
}

export function transformZone(
  zone: GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>,
  rotation: number,
  scale = 1,
  center = featureCenter(zone),
) {
  const transform = (coordinate: number[]) => transformCoordinate(coordinate, center, rotation, scale);
  const polygon = (geometry: GeoJSON.Polygon): GeoJSON.Polygon => ({
    type: 'Polygon',
    coordinates: geometry.coordinates.map((r) => r.map(transform)),
  });
  const p = zone.properties,
    access = p.accessPoint && transform([p.accessPoint.lng, p.accessPoint.lat]);
  const layoutCenter = p.layout && transform([p.layout.center.lng, p.layout.center.lat]);
  return {
    ...zone,
    geometry: polygon(zone.geometry),
    properties: {
      ...p,
      geometryParts: p.geometryParts?.map(polygon),
      layoutRings: p.layoutRings?.map((r) => r.map(transform)),
      layout:
        p.layout && layoutCenter
          ? {
              ...p.layout,
              center: { lng: layoutCenter[0], lat: layoutCenter[1] },
              widthMeters: p.layout.widthMeters * scale,
              heightMeters: p.layout.heightMeters * scale,
              rotation: p.layout.rotation + rotation,
            }
          : undefined,
      accessPoint: access ? { lng: access[0], lat: access[1] } : undefined,
    },
  };
}

export function transformZoneGroup(
  zones: MapZonesGeoJson,
  pois: MapPoisGeoJson,
  rootId: string,
  transform: (zone: MapZonesGeoJson['features'][number]) => MapZonesGeoJson['features'][number],
  transformPoint: (coordinate: number[]) => Coordinate,
) {
  const ids = new Set([rootId]);
  for (let changed = true; changed; ) {
    changed = false;
    for (const f of zones.features)
      if (f.properties.parentZoneId && ids.has(f.properties.parentZoneId) && !ids.has(f.properties.id)) {
        ids.add(f.properties.id);
        changed = true;
      }
  }
  return {
    zones: { ...zones, features: zones.features.map((f) => (ids.has(f.properties.id) ? transform(f) : f)) },
    pois: {
      ...pois,
      features: pois.features.map((f) => {
        if (!f.properties.sourceZoneId || !ids.has(f.properties.sourceZoneId)) return f;
        const access =
          f.properties.accessPoint &&
          transformPoint([f.properties.accessPoint.lng, f.properties.accessPoint.lat]);
        return {
          ...f,
          geometry: { type: 'Point' as const, coordinates: transformPoint(f.geometry.coordinates) },
          properties: {
            ...f.properties,
            accessPoint: access ? { lng: access[0], lat: access[1] } : undefined,
          },
        };
      }),
    },
  };
}

export function selectionFeature(
  selection: MapSelection,
  zones: MapZonesGeoJson,
  paths: MapPathsGeoJson,
  pois: MapPoisGeoJson,
) {
  if (!selection) return undefined;
  return (
    selection.kind === 'zone' ? zones.features : selection.kind === 'path' ? paths.features : pois.features
  ).find((f) => f.properties.id === selection.id);
}

export function featureCenter(feature: GeoJSON.Feature): Coordinate {
  if (feature.geometry.type === 'Point') return feature.geometry.coordinates as Coordinate;
  const coordinates =
    feature.geometry.type === 'Polygon'
      ? feature.geometry.coordinates[0]
      : feature.geometry.type === 'LineString'
        ? feature.geometry.coordinates
        : [];
  const center = ringCentroid(coordinates as Coordinate[]);
  return [center.lng, center.lat];
}
