import type { LatLng, MapZoneProperties } from '../../types/map';
import { overlayToImageCoordinates, overlayToYandexLayoutBounds } from './overlayGeoref';

const METERS_PER_DEG_LAT = 111_320;

function metersPerDegLng(lat: number): number {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

export type ZoneRectLayout = {
  center: LatLng;
  widthMeters: number;
  heightMeters: number;
  rotation: number;
};

function openRing(ring: [number, number][]): [number, number][] {
  if (ring.length < 2) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring.slice(0, -1);
  return ring;
}

function polygonToRectLayout(ring: [number, number][]): ZoneRectLayout {
  const open = openRing(ring);
  const lng = open.reduce((sum, [x]) => sum + x, 0) / open.length;
  const lat = open.reduce((sum, [, y]) => sum + y, 0) / open.length;
  const center = { lat, lng };
  const lngs = open.map(([x]) => x);
  const lats = open.map(([, y]) => y);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const widthMeters = Math.max(2, (maxLng - minLng) * metersPerDegLng(center.lat));
  const heightMeters = Math.max(2, (maxLat - minLat) * METERS_PER_DEG_LAT);
  return { center, widthMeters, heightMeters, rotation: 0 };
}

export function zoneImageLayout(
  feature: GeoJSON.Feature<GeoJSON.Polygon, MapZoneProperties>,
): ZoneRectLayout {
  const layout = feature.properties.layout;
  if (layout) {
    return {
      center: layout.center,
      widthMeters: layout.widthMeters,
      heightMeters: layout.heightMeters,
      rotation: layout.rotation,
    };
  }
  const ring = feature.geometry.coordinates[0] as [number, number][];
  return polygonToRectLayout(ring);
}

export function zoneFillImageBounds(layout: ZoneRectLayout): [[number, number], [number, number]] {
  return overlayToYandexLayoutBounds({
    center: layout.center,
    widthMeters: layout.widthMeters,
    aspectRatio: layout.heightMeters / layout.widthMeters,
  });
}

export function zoneFillImageCoordinates(
  layout: ZoneRectLayout,
  rotation?: number,
): [[number, number], [number, number], [number, number], [number, number]] {
  return overlayToImageCoordinates({
    center: layout.center,
    widthMeters: layout.widthMeters,
    aspectRatio: layout.heightMeters / layout.widthMeters,
    rotation: rotation ?? layout.rotation,
  });
}
