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
  // GeoJSON repeats the first vertex; it must not bias the center.
  const closed = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  if (closed) {
    lng -= ring[0][0];
    lat -= ring[0][1];
  }
  const count = closed ? ring.length - 1 : ring.length;
  return { lat: lat / count, lng: lng / count };
}

export function zoneTargetPoint(
  feature: GeoJSON.Feature<GeoJSON.Polygon, import('../../types/map').MapZoneProperties>,
): LatLng {
  if (feature.properties.accessPoint) return feature.properties.accessPoint;
  const layoutCenter = feature.properties?.layout?.center;
  if (layoutCenter) {
    return layoutCenter;
  }
  const ring = feature.geometry.coordinates[0] as [number, number][];
  return polygonCentroid(ring);
}
