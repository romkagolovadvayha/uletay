import { NextRequest } from 'next/server';
import { jsonResponse, optionsResponse } from '@/lib/api-response';
import { YANDEX_MAPS_API_KEY } from '@/lib/yandex-maps-config';
import { parseRouteInput } from '@/lib/route-input';
import { consumeRateLimit, RateLimitError, requestSource } from '@/lib/rate-limit';

const YANDEX_ROUTER_BASE = 'https://api.routing.yandex.net/v2/route';

function appendAvoidZones(url: string, avoidZones: string[]): string {
  if (avoidZones.length === 0) return url;
  const params = avoidZones.map((zone) => `avoid_zones=${encodeURIComponent(zone)}`).join('&');
  return `${url}&${params}`;
}

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const input = parseRouteInput(searchParams);
  if (!input) return jsonResponse({ error: 'Invalid coordinates' }, 400);
  const { mode, waypoints, avoidZones } = input;
  try {
    consumeRateLimit('routing', requestSource(request.headers), 60, 60_000);
  } catch (error) {
    if (!(error instanceof RateLimitError)) throw error;
    const response = jsonResponse({ error: error.message }, 429);
    response.headers.set('Retry-After', String(error.retryAfter));
    return response;
  }

  if (!YANDEX_MAPS_API_KEY) {
    return jsonResponse({ error: 'Yandex Maps API key is not configured' }, 503);
  }

  const url = appendAvoidZones(
    `${YANDEX_ROUTER_BASE}?apikey=${encodeURIComponent(YANDEX_MAPS_API_KEY)}&waypoints=${encodeURIComponent(waypoints)}&mode=${mode}`,
    avoidZones,
  );

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await response.json();
    if (!response.ok) {
      return jsonResponse({ error: 'Yandex routing failed', details: data }, response.status);
    }
    return jsonResponse(data);
  } catch {
    return jsonResponse({ error: 'Сервис маршрутов временно недоступен' }, 502);
  }
}
