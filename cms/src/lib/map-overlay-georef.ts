import type { LatLng, MapAdminOverlay } from '@/types';

const METERS_PER_DEG_LAT = 111_320;

function metersPerDegLng(lat: number): number {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

/** Ширина territory bounds в метрах (по долготе). */
export function estimateBoundsWidthMeters(sw: LatLng, ne: LatLng): number {
  const latMid = (sw.lat + ne.lat) / 2;
  return (ne.lng - sw.lng) * metersPerDegLng(latMid);
}

export function defaultOverlayFromBounds(
  imageUrl: string,
  center: LatLng,
  territoryBounds: { sw: LatLng; ne: LatLng } | undefined,
  aspectRatio: number,
): MapAdminOverlay {
  const widthMeters = territoryBounds
    ? estimateBoundsWidthMeters(territoryBounds.sw, territoryBounds.ne)
    : 650;

  return {
    imageUrl,
    opacity: 0.5,
    center,
    widthMeters,
    aspectRatio,
    rotation: 0,
  };
}
