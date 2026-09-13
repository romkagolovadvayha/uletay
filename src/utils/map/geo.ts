import type { LatLng } from '../../types/map';
import { openExternalUrl } from '../openExternalUrl';

export * from './geo-math';

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
