import { API_BASE_URL } from '../../config/api';
import { apiFetch } from '../../api/apiFetch';
import type { LatLng } from '../../types/map';
import type { ExternalRouteResult } from './externalRouting';

const cache = new Map<string, { expires: number; route: ExternalRouteResult }>();
const pending = new Map<string, Promise<ExternalRouteResult>>();
const validPoint = (p: LatLng) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;

async function json(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = url.startsWith(`${API_BASE_URL}/`) ? await apiFetch(url.slice(API_BASE_URL.length), {signal:controller.signal},4000) : await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Routing HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function validRoute(route: ExternalRouteResult): boolean {
  return route.coordinates.length >= 2 && route.coordinates.every(p => Array.isArray(p) && validPoint({ lng: p[0], lat: p[1] })) &&
    Number.isFinite(route.distanceMeters) && route.distanceMeters >= 0 && Number.isFinite(route.durationSeconds) && route.durationSeconds >= 0;
}

async function requestDrivingRoute(from: LatLng, to: LatLng): Promise<ExternalRouteResult> {
  // Same road provider as taxi; no browser API key or paid JS SDK is required.
  try {
    const data = await json(`https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`) as {
      code?: string; routes?: { geometry?: { coordinates?: [number, number][] }; distance: number; duration: number }[];
    };
    const first = data.routes?.[0];
    const route = { coordinates: first?.geometry?.coordinates ?? [], distanceMeters: first?.distance ?? NaN, durationSeconds: first?.duration ?? NaN };
    if (data.code === 'Ok' && validRoute(route)) return route;
  } catch { /* Try the existing server-side provider. */ }

  try {
    const params = new URLSearchParams({ waypoints: `${from.lat},${from.lng}|${to.lat},${to.lng}`, mode: 'driving' });
    const data = await json(`${API_BASE_URL.replace(/\/$/, '')}/route?${params}`) as {
      route?: { legs?: { status?: string; steps?: { length?: number; duration?: number; waiting_duration?: number; polyline?: { points?: [number, number][] } }[] }[] };
    };
    const legs = data.route?.legs;
    if (legs?.length && legs.every(leg => leg.status === 'OK')) {
      const steps = legs.flatMap(leg => leg.steps ?? []);
      const route: ExternalRouteResult = {
        coordinates: steps.flatMap(step => step.polyline?.points?.map(([lat, lng]): [number, number] => [lng, lat]) ?? []),
        distanceMeters: steps.reduce((sum, step) => sum + (step.length ?? 0), 0),
        durationSeconds: steps.reduce((sum, step) => sum + (step.duration ?? 0) + (step.waiting_duration ?? 0), 0),
      };
      if (validRoute(route)) return route;
    }
  } catch { /* A straight line is not a road route. */ }
  throw new Error('Не удалось построить автомаршрут');
}

export async function fetchDrivingRoute(from: LatLng, to: LatLng): Promise<ExternalRouteResult> {
  if (!validPoint(from) || !validPoint(to)) throw new Error('Некорректные координаты');
  const key = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.route;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = requestDrivingRoute(from, to).then(route => {
    cache.delete(key);
    if (cache.size >= 32) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + 5 * 60_000, route });
    return route;
  }).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
