import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { point, polygon as turfPolygon } from '@turf/helpers';
import type { MapPathProperties, MapPathsGeoJson, MapZoneProperties, MapZonesGeoJson } from '../../types/map';

export type FenceZones = GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>[];

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
    !isFencePathFeature(feature)
  );
}

export function extractFenceZones(zones?: MapZonesGeoJson): FenceZones {
  return (zones?.features ?? []).filter((f) => f.properties.zoneType === 'fence') as FenceZones;
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

function sampleSegmentPoints(a: [number, number], b: [number, number], samples = 4): [number, number][] {
  const points: [number, number][] = [a];
  for (let i = 1; i < samples; i += 1) {
    const t = i / samples;
    points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  points.push(b);
  return points;
}

export function routeCrossesFenceZones(
  coordinates: [number, number][],
  fenceZones: FenceZones,
): boolean {
  if (fenceZones.length === 0 || coordinates.length < 2) return false;

  const polys = fenceZones
    .map((feature) => {
      try {
        return turfPolygon(feature.geometry.coordinates);
      } catch {
        return null;
      }
    })
    .filter((poly): poly is GeoJSON.Feature<GeoJSON.Polygon> => poly != null);

  for (let i = 0; i < coordinates.length - 1; i += 1) {
    for (const sample of sampleSegmentPoints(coordinates[i], coordinates[i + 1])) {
      const pt = point(sample);
      for (const poly of polys) {
        if (booleanPointInPolygon(pt, poly)) return true;
      }
    }
  }

  return false;
}

export function routableDrawnFeatures(paths?: MapPathsGeoJson) {
  return (paths?.features ?? []).filter((f): f is GeoJSON.Feature<GeoJSON.LineString, MapPathProperties> =>
    isRoutableDrawnPath(f as GeoJSON.Feature<GeoJSON.LineString, MapPathProperties>),
  );
}
