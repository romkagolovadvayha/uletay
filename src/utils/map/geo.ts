import type { LatLng, FestivalMapConfig } from '../../types/map';
import { openExternalUrl } from '../openExternalUrl';

const EARTH_RADIUS_M = 6371000;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function isInsideTerritory(
  point: LatLng,
  config?: FestivalMapConfig,
): boolean {
  const bounds = config?.territoryBounds;
  if (!bounds) return true;
  return (
    point.lat >= bounds.sw.lat &&
    point.lat <= bounds.ne.lat &&
    point.lng >= bounds.sw.lng &&
    point.lng <= bounds.ne.lng
  );
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} км`;
  }
  return `${Math.round(meters)} м`;
}

export function formatDuration(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m > 0 ? `~${h} ч ${m} мин` : `~${h} ч`;
  }
  if (seconds >= 60) {
    return `~${Math.round(seconds / 60)} мин`;
  }
  return `~${Math.round(seconds)} сек`;
}

export function latLngToCoord(lat: number, lng: number): [number, number] {
  return [lng, lat];
}

export function coordToLatLng(coord: [number, number]): LatLng {
  return { lng: coord[0], lat: coord[1] };
}

export function buildYandexRouteUrl(from: LatLng | null | undefined, to: LatLng): string {
  const dest = `${to.lat},${to.lng}`;
  if (from) {
    return `https://yandex.ru/maps/?mode=routes&rtext=${from.lat},${from.lng}~${dest}&rtt=auto`;
  }
  return `https://yandex.ru/maps/?mode=routes&rtext=~${dest}&rtt=auto`;
}

export function buildGoogleMapsRouteUrl(to: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}`;
}

export function openYandexNavigation(
  from: LatLng | null | undefined,
  to: LatLng,
): void {
  openExternalUrl(buildYandexRouteUrl(from, to));
}

export function openExternalNavigation(
  from: LatLng,
  to: LatLng,
  _label?: string,
): void {
  openYandexNavigation(from, to);
}
