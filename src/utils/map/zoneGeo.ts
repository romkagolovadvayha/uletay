import type { LatLng } from '../../types/map';

export function polygonCentroid(ring: [number, number][]): LatLng {
  if (ring.length === 0) {
    return { lat: 0, lng: 0 };
  }
  let lng = 0;
  let lat = 0;
  for (const [x, y] of ring) {
    lng += x;
    lat += y;
  }
  const count = ring.length;
  return { lat: lat / count, lng: lng / count };
}

export function zoneTargetPoint(
  feature: GeoJSON.Feature<GeoJSON.Polygon, import('../../types/map').MapZoneProperties>,
): LatLng {
  const layoutCenter = feature.properties?.layout?.center;
  if (layoutCenter) {
    return layoutCenter;
  }
  const ring = feature.geometry.coordinates[0] as [number, number][];
  return polygonCentroid(ring);
}
