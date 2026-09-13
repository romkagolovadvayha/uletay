import { YANDEX_MAPS_API_KEY } from '../../config/yandexMaps';
import { API_BASE_URL } from '../../config/api';
import { fetchWithTimeout } from '../fetchWithTimeout';
import type { LatLng } from '../../types/map';
import { haversineMeters } from './geo-math';
export { walkingDurationSeconds } from './geo-math';

const OSRM_DRIVING_BASE = 'https://router.project-osrm.org/route/v1/driving';
const OSRM_WALKING_BASE = 'https://router.project-osrm.org/route/v1/foot';
const YANDEX_ROUTER_BASE = 'https://api.routing.yandex.net/v2/route';
const MAX_WALKING_WAYPOINTS = 25;

const cache = new Map<string, { expires: number; result: ExternalRouteResult }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface ExternalRouteResult {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

export type RouteTravelMode = 'driving' | 'walking';

export type RouteRequestOptions = {
  avoidZones?: string[];
};

function cacheKey(waypoints: LatLng[], mode: RouteTravelMode, avoidZones?: string[]): string {
  const avoid = avoidZones?.join(';') ?? '';
  return `${mode}:${avoid}:${waypoints.map((p) => `${p.lat},${p.lng}`).join('->')}`;
}

function appendUnique(coords: [number, number][], next: [number, number]) {
  const last = coords[coords.length - 1];
  if (!last || haversineMeters({ lat: last[1], lng: last[0] }, { lat: next[1], lng: next[0] }) > 0.5) {
    coords.push(next);
  }
}

function formatYandexWaypoints(waypoints: LatLng[]): string {
  return waypoints.map((p) => `${p.lat},${p.lng}`).join('|');
}

function formatOsrmWaypoints(waypoints: LatLng[]): string {
  return waypoints.map((p) => `${p.lng},${p.lat}`).join(';');
}

export function sampleRouteWaypoints(coordinates: [number, number][], maxPoints = MAX_WALKING_WAYPOINTS): LatLng[] {
  if (coordinates.length === 0) return [];
  if (coordinates.length <= maxPoints) {
    return coordinates.map(([lng, lat]) => ({ lat, lng }));
  }

  const sampled: LatLng[] = [];
  const step = (coordinates.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i += 1) {
    const idx = Math.min(coordinates.length - 1, Math.round(i * step));
    const [lng, lat] = coordinates[idx];
    sampled.push({ lat, lng });
  }
  return sampled;
}

function parseYandexRoute(data: unknown): ExternalRouteResult | null {
  const route = (data as { route?: { legs?: {
    status?: string;
    steps?: {
      length?: number;
      duration?: number;
      waiting_duration?: number;
      polyline?: { points?: [number, number][] };
    }[];
  }[] } }).route;
  const legs = route?.legs;
  if (!legs?.length || legs.some((leg) => leg.status !== 'OK')) return null;

  const coordinates: [number, number][] = [];
  let distanceMeters = 0;
  let durationSeconds = 0;

  for (const step of legs.flatMap((leg) => leg.steps ?? [])) {
    distanceMeters += step.length ?? 0;
    durationSeconds += (step.duration ?? 0) + (step.waiting_duration ?? 0);
    for (const point of step.polyline?.points ?? []) {
      const [lat, lng] = point;
      appendUnique(coordinates, [lng, lat]);
    }
  }

  if (coordinates.length < 2 && durationSeconds <= 0) return null;

  return {
    coordinates,
    distanceMeters,
    durationSeconds: Math.max(1, durationSeconds),
  };
}

function parseOsrmRoute(data: unknown): ExternalRouteResult | null {
  const route = (data as {
    routes?: {
      distance: number;
      duration: number;
      geometry: { coordinates: [number, number][] };
    }[];
  }).routes?.[0];
  if (!route) return null;

  return {
    coordinates: route.geometry.coordinates,
    distanceMeters: route.distance,
    durationSeconds: Math.max(1, route.duration),
  };
}

function appendAvoidZones(url: string, avoidZones?: string[]): string {
  if (!avoidZones?.length) return url;
  const params = avoidZones.map((zone) => `avoid_zones=${encodeURIComponent(zone)}`).join('&');
  return `${url}&${params}`;
}

async function fetchYandexRouteDirect(
  waypoints: LatLng[],
  mode: RouteTravelMode,
  avoidZones?: string[],
): Promise<ExternalRouteResult | null> {
  if (!YANDEX_MAPS_API_KEY || waypoints.length < 2) return null;

  const waypointsStr = formatYandexWaypoints(waypoints);
  let url = `${YANDEX_ROUTER_BASE}?apikey=${encodeURIComponent(YANDEX_MAPS_API_KEY)}&waypoints=${encodeURIComponent(waypointsStr)}&mode=${mode}`;
  url = appendAvoidZones(url, avoidZones);

  try {
    const response = await fetchWithTimeout(url, {}, 8000);
    if (!response.ok) return null;
    return parseYandexRoute(await response.json());
  } catch {
    return null;
  }
}

async function fetchYandexRouteViaProxy(
  waypoints: LatLng[],
  mode: RouteTravelMode,
  avoidZones?: string[],
): Promise<ExternalRouteResult | null> {
  if (waypoints.length < 2) return null;

  const base = API_BASE_URL.replace(/\/$/, '');
  const params = new URLSearchParams({
    waypoints: formatYandexWaypoints(waypoints),
    mode,
  });
  for (const zone of avoidZones ?? []) {
    params.append('avoidZones', zone);
  }
  const url = `${base}/route?${params.toString()}`;

  try {
    const response = await fetchWithTimeout(url, {}, 8000);
    if (!response.ok) return null;
    const data = await response.json();
    if ((data as { error?: string }).error) return null;
    return parseYandexRoute(data);
  } catch {
    return null;
  }
}

async function fetchOsrmRoute(
  waypoints: LatLng[],
  mode: RouteTravelMode,
): Promise<ExternalRouteResult | null> {
  if (waypoints.length < 2) return null;

  const base = mode === 'walking' ? OSRM_WALKING_BASE : OSRM_DRIVING_BASE;
  const url = `${base}/${formatOsrmWaypoints(waypoints)}?overview=full&geometries=geojson`;

  try {
    const response = await fetchWithTimeout(url, {}, 8000);
    if (!response.ok) return null;
    return parseOsrmRoute(await response.json());
  } catch {
    return null;
  }
}

export function straightLineFallback(
  waypoints: LatLng[],
  mode: RouteTravelMode = 'walking',
): ExternalRouteResult {
  const coordinates: [number, number][] = waypoints.map((p) => [p.lng, p.lat]);
  let distanceMeters = 0;
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    distanceMeters += haversineMeters(waypoints[i], waypoints[i + 1]);
  }
  const speedMps = mode === 'driving' ? 13.9 : 1.2;
  return {
    coordinates,
    distanceMeters,
    durationSeconds: Math.max(60, distanceMeters / speedMps),
  };
}

export async function fetchRoadRoute(
  waypoints: LatLng[],
  mode: RouteTravelMode = 'walking',
  options?: RouteRequestOptions,
): Promise<ExternalRouteResult> {
  if (waypoints.length < 2) {
    return straightLineFallback(waypoints.length === 1 ? [waypoints[0], waypoints[0]] : [{ lat: 0, lng: 0 }, { lat: 0, lng: 0 }], mode);
  }

  const avoidZones = options?.avoidZones;
  const key = cacheKey(waypoints, mode, avoidZones);
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.result;
  }

  const providers = [
    () => fetchYandexRouteViaProxy(waypoints, mode, avoidZones),
    () => fetchYandexRouteDirect(waypoints, mode, avoidZones),
    () => fetchOsrmRoute(waypoints, mode),
  ];

  for (const provider of providers) {
    const result = await provider();
    if (result) {
      cache.set(key, { expires: Date.now() + CACHE_TTL_MS, result });
      return result;
    }
  }

  const fallback = straightLineFallback(waypoints, mode);
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, result: fallback });
  return fallback;
}

export async function fetchWalkingRoute(
  from: LatLng,
  to: LatLng,
  options?: RouteRequestOptions,
): Promise<ExternalRouteResult> {
  return fetchRoadRoute([from, to], 'walking', options);
}

export async function fetchDrivingRoute(from: LatLng, to: LatLng): Promise<ExternalRouteResult> {
  return fetchRoadRoute([from, to], 'driving');
}

/** Duration from Yandex/OSRM for a path geometry (geometry stays unchanged). */
export async function fetchWalkingDurationForPath(
  coordinates: [number, number][],
  options?: RouteRequestOptions,
): Promise<number> {
  const waypoints = sampleRouteWaypoints(coordinates);
  if (waypoints.length < 2) return 0;
  const route = await fetchRoadRoute(waypoints, 'walking', options);
  return route.durationSeconds;
}
