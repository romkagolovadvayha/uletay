import type { LatLng } from '@/types';

const METERS_PER_DEG_LAT = 111_320;

export function metersPerDegLng(lat: number): number {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

export type RectLayout = {
  center: LatLng;
  widthMeters: number;
  heightMeters: number;
  rotation: number;
};

export function rectToPolygonRing(layout: RectLayout): [number, number][] {
  const { center, widthMeters, heightMeters, rotation } = layout;
  const halfW = widthMeters / 2;
  const halfH = heightMeters / 2;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const lngScale = metersPerDegLng(center.lat);

  const localCorners: [number, number][] = [
    [-halfW, halfH],
    [halfW, halfH],
    [halfW, -halfH],
    [-halfW, -halfH],
  ];

  const ring = localCorners.map(([x, y]) => {
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;
    return [center.lng + rx / lngScale, center.lat + ry / METERS_PER_DEG_LAT] as [number, number];
  });
  ring.push(ring[0]);
  return ring;
}

export function rectToPolygon(layout: RectLayout): GeoJSON.Polygon {
  return { type: 'Polygon', coordinates: [rectToPolygonRing(layout)] };
}

export function ringCentroid(ring: [number, number][]): LatLng {
  const open = ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.slice(0, -1)
    : ring;
  const lng = open.reduce((sum, [x]) => sum + x, 0) / open.length;
  const lat = open.reduce((sum, [, y]) => sum + y, 0) / open.length;
  return { lat, lng };
}

export function translateCoords(
  coords: [number, number][],
  dLng: number,
  dLat: number,
): [number, number][] {
  return coords.map(([lng, lat]) => [lng + dLng, lat + dLat] as [number, number]);
}

export function nudgeLatLng(lat: number, lng: number, northM: number, eastM: number): LatLng {
  return {
    lat: lat + northM / METERS_PER_DEG_LAT,
    lng: lng + eastM / (METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)),
  };
}

export function newMapId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

export function cloneRing(ring: [number, number][]): [number, number][] {
  return ring.map(([lng, lat]) => [lng, lat] as [number, number]);
}

export function openRing(ring: [number, number][]): [number, number][] {
  if (ring.length < 2) return cloneRing(ring);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring.slice(0, -1);
  return cloneRing(ring);
}

export function closeRing(ring: [number, number][]): [number, number][] {
  const open = openRing(ring);
  if (open.length === 0) return [];
  return [...open, open[0]];
}

/** Approximate axis-aligned rectangle from a polygon ring (for «convert to rect»). */
export function polygonToRectLayout(ring: [number, number][]): RectLayout {
  const open = openRing(ring);
  const center = ringCentroid(open);
  const lngs = open.map(([lng]) => lng);
  const lats = open.map(([, lat]) => lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const widthMeters = Math.max(2, (maxLng - minLng) * metersPerDegLng(center.lat));
  const heightMeters = Math.max(2, (maxLat - minLat) * METERS_PER_DEG_LAT);
  return { center, widthMeters, heightMeters, rotation: 0 };
}
