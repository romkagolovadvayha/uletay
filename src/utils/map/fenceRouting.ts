import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { point, polygon as turfPolygon } from '@turf/helpers';
import type { MapPathProperties, MapPathsGeoJson, MapZoneProperties, MapZonesGeoJson } from '../../types/map';

export type FenceZones = GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>[];
export type FencePaths = GeoJSON.Feature<GeoJSON.LineString, MapPathProperties>[];

const FENCE_NAME_RE = /забор|ограж|fence|barrier/i;

export function isFencePathFeature(
  feature: GeoJSON.Feature<GeoJSON.LineString, MapPathProperties>,
): boolean {
  if (feature.properties.pathKind === 'fence') return true;
  const label = `${feature.properties.id ?? ''} ${feature.properties.name ?? ''}`;
  return FENCE_NAME_RE.test(label);
}

export function isRoutableDrawnPath(
  feature: GeoJSON.Feature<GeoJSON.LineString, MapPathProperties>,
): boolean {
  return (
    feature.geometry.type === 'LineString' &&
    feature.geometry.coordinates.length >= 2 &&
    feature.properties.closed !== true &&
    !isFencePathFeature(feature)
  );
}

export function extractFenceZones(zones?: MapZonesGeoJson): FenceZones {
  return (zones?.features ?? []).filter((f) => f.properties.zoneType === 'fence' || f.properties.zoneType === 'stage_area' || f.properties.accessRestricted) as FenceZones;
}

export function extractFencePaths(paths?: MapPathsGeoJson): FencePaths {
  return (paths?.features ?? []).filter((feature) =>
    isFencePathFeature(feature as GeoJSON.Feature<GeoJSON.LineString, MapPathProperties>),
  ) as FencePaths;
}

function orientation(a: [number, number], b: [number, number], c: [number, number]) {
  return (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
}

function segmentsIntersect(
  a: [number, number],
  b: [number, number],
  c: [number, number],
  d: [number, number],
) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

export function routeCrossesFencePaths(
  coordinates: [number, number][],
  fencePaths: FencePaths,
): boolean {
  for (let routeIndex = 0; routeIndex < coordinates.length - 1; routeIndex += 1) {
    for (const fence of fencePaths) {
      const fenceCoordinates = fence.geometry.coordinates as [number, number][];
      for (let fenceIndex = 0; fenceIndex < fenceCoordinates.length - 1; fenceIndex += 1) {
        if (
          segmentsIntersect(
            coordinates[routeIndex],
            coordinates[routeIndex + 1],
            fenceCoordinates[fenceIndex],
            fenceCoordinates[fenceIndex + 1],
          )
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

/** Yandex Router avoid_zones: each polygon as lat,lng|lat,lng|... */
export function fenceAvoidZonesParam(fenceZones: FenceZones): string[] {
  return fenceZones
    .map((feature) => {
      const ring = feature.geometry.coordinates[0];
      if (!ring || ring.length < 3) return null;
      const closed =
        ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
          ? ring
          : [...ring, ring[0]];
      return closed.map(([lng, lat]) => `${lat},${lng}`).join('|');
    })
    .filter((value): value is string => Boolean(value));
}

export function routeCrossesFenceZones(
  coordinates: [number, number][],
  fenceZones: FenceZones,
): boolean {
  if (fenceZones.length === 0 || coordinates.length === 0) return false;

  const polys = fenceZones
    .map((feature) => {
      try {
        return turfPolygon(feature.geometry.coordinates);
      } catch {
        return null;
      }
    })
    .filter((poly): poly is GeoJSON.Feature<GeoJSON.Polygon> => poly != null);

  for (const poly of polys) {
    if (coordinates.some(coordinate => booleanPointInPolygon(point(coordinate), poly))) return true;
    for (let i = 1; i < coordinates.length; i++) {
      if (poly.geometry.coordinates.some(ring => ring.slice(1).some((b, j) =>
        segmentsIntersect(coordinates[i - 1], coordinates[i], ring[j] as [number, number], b as [number, number])))) return true;
    }
  }

  return false;
}

export function routableDrawnFeatures(paths?: MapPathsGeoJson) {
  return (paths?.features ?? []).filter((f): f is GeoJSON.Feature<GeoJSON.LineString, MapPathProperties> =>
    isRoutableDrawnPath(f as GeoJSON.Feature<GeoJSON.LineString, MapPathProperties>),
  );
}

/** Shared visible/routable network: no public road may lead behind a stage. */
export function visitorPathFeatures(paths?: MapPathsGeoJson, zones?: MapZonesGeoJson): FencePaths {
  const fencePaths = extractFencePaths(paths), fenceZones = extractFenceZones(zones);
  return routableDrawnFeatures(paths).flatMap(feature => {
    const parts: FencePaths = [];
    let current: [number, number][] = [];
    const flush = () => {
      if (current.length >= 2) parts.push({ ...feature,
        properties: { ...feature.properties, id: `${feature.properties.id}:visitor-${parts.length}`, sourcePathId: feature.properties.id },
        geometry: { type: 'LineString', coordinates: current } });
      current = [];
    };
    feature.geometry.coordinates.slice(1).forEach((b, index) => {
      const coordinates = [feature.geometry.coordinates[index], b] as [number, number][];
      if (routeCrossesFencePaths(coordinates, fencePaths) || routeCrossesFenceZones(coordinates, fenceZones)) flush();
      else { if (!current.length) current.push(coordinates[0]); current.push(coordinates[1]); }
    });
    flush();
    return parts;
  });
}
