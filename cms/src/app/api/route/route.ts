import { NextRequest } from 'next/server';
import { jsonResponse, optionsResponse } from '@/lib/api-response';
import { YANDEX_MAPS_API_KEY } from '@/lib/yandex-maps-config';

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
  const mode = searchParams.get('mode') === 'driving' ? 'driving' : 'walking';

  let waypoints = searchParams.get('waypoints')?.trim() ?? '';

  if (!waypoints) {
    const fromLat = Number(searchParams.get('fromLat'));
    const fromLng = Number(searchParams.get('fromLng'));
    const toLat = Number(searchParams.get('toLat'));
    const toLng = Number(searchParams.get('toLng'));

    if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
      return jsonResponse({ error: 'Invalid coordinates' }, 400);
    }

    waypoints = `${fromLat},${fromLng}|${toLat},${toLng}`;
  }

  if (!YANDEX_MAPS_API_KEY) {
    return jsonResponse({ error: 'Yandex Maps API key is not configured' }, 503);
  }

  const url = appendAvoidZones(
    `${YANDEX_ROUTER_BASE}?apikey=${encodeURIComponent(YANDEX_MAPS_API_KEY)}&waypoints=${encodeURIComponent(waypoints)}&mode=${mode}`,
    searchParams.getAll('avoidZones'),
  );

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      return jsonResponse({ error: 'Yandex routing failed', details: data }, response.status);
    }
    return jsonResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server error';
    return jsonResponse({ error: message }, 500);
  }
}
