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

/** Углы PNG на карте: TL, TR, BR, BL (MapLibre image source). */
export function overlayToImageCoordinates(
  overlay: Pick<MapAdminOverlay, 'center' | 'widthMeters' | 'aspectRatio' | 'rotation'>,
): [[number, number], [number, number], [number, number], [number, number]] {
  const { center, widthMeters, aspectRatio = 0.75, rotation = 0 } = overlay;
  const heightMeters = widthMeters * aspectRatio;
  const halfW = widthMeters / 2;
  const halfH = heightMeters / 2;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const localCorners: [number, number][] = [
    [-halfW, halfH],
    [halfW, halfH],
    [halfW, -halfH],
    [-halfW, -halfH],
  ];

  const lngScale = metersPerDegLng(center.lat);

  return localCorners.map(([x, y]) => {
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;
    return [center.lng + rx / lngScale, center.lat + ry / METERS_PER_DEG_LAT] as [number, number];
  }) as [[number, number], [number, number], [number, number], [number, number]];
}

/** Geographic bounds of unrotated rectangle — rotation applied via CSS on overlay. */
export function overlayToYandexLayoutBounds(
  overlay: Pick<MapAdminOverlay, 'center' | 'widthMeters' | 'aspectRatio'>,
): [[number, number], [number, number]] {
  const { center, widthMeters, aspectRatio = 0.75 } = overlay;
  const heightMeters = widthMeters * aspectRatio;
  const halfW = widthMeters / 2;
  const halfH = heightMeters / 2;
  const lngScale = metersPerDegLng(center.lat);

  return [
    [center.lng - halfW / lngScale, center.lat - halfH / METERS_PER_DEG_LAT],
    [center.lng + halfW / lngScale, center.lat + halfH / METERS_PER_DEG_LAT],
  ];
}

/** @deprecated Use overlayToYandexLayoutBounds + CSS rotation instead. */
export function overlayToYandexBounds(
  overlay: Pick<MapAdminOverlay, 'center' | 'widthMeters' | 'aspectRatio' | 'rotation'>,
): [[number, number], [number, number]] {
  return overlayToYandexLayoutBounds(overlay);
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
