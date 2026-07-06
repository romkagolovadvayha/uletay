import type { LatLng } from '../../types/map';
import { haversineMeters } from './geo';

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const cache = new Map<string, { expires: number; result: OsrmRouteResult }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface OsrmRouteResult {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

function cacheKey(from: LatLng, to: LatLng): string {
  return `${from.lat},${from.lng}->${to.lat},${to.lng}`;
}

export async function fetchDrivingRoute(
  from: LatLng,
  to: LatLng,
): Promise<OsrmRouteResult | null> {
  const key = cacheKey(from, to);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.result;
  }

  const url = `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as {
      routes?: {
        distance: number;
        duration: number;
        geometry: { coordinates: [number, number][] };
      }[];
    };
    const route = data.routes?.[0];
    if (!route) return null;
    const result: OsrmRouteResult = {
      coordinates: route.geometry.coordinates,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
    cache.set(key, { expires: Date.now() + CACHE_TTL_MS, result });
    return result;
  } catch {
    return null;
  }
}

export function straightLineFallback(
  from: LatLng,
  to: LatLng,
): OsrmRouteResult {
  const distanceMeters = haversineMeters(from, to);
  return {
    coordinates: [
      [from.lng, from.lat],
      [to.lng, to.lat],
    ],
    distanceMeters,
    durationSeconds: (distanceMeters / 1000 / 60) * 3600,
  };
}
