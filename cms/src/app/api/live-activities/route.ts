import { NextRequest } from 'next/server';
import { jsonResponse, optionsResponse } from '@/lib/api-response';
import { readRequestJson, RequestJsonError } from '@/lib/request-json';
import { consumeRateLimit, RateLimitError, requestSource } from '@/lib/rate-limit';
import { activityApnsConfig } from '@/lib/festival-activity-apns';
import { ActivityRegistrationError, registerFestivalActivities } from '@/lib/festival-activities';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function OPTIONS() { return optionsResponse(); }
export async function POST(request: NextRequest) {
  try {
    consumeRateLimit('live-activity-register', requestSource(request.headers), 1200, 60_000);
    if (!activityApnsConfig()) return jsonResponse({ error: 'Live Activity updates are not enabled' }, 503);
    const body = await readRequestJson(request, 16_384);
    const id = (body as { installationId?: unknown })?.installationId;
    if (typeof id === 'string') consumeRateLimit('live-activity-installation', id.slice(0, 36), 30, 60_000);
    return jsonResponse(await registerFestivalActivities(body));
  } catch (error) {
    if (error instanceof RequestJsonError || error instanceof ActivityRegistrationError) return jsonResponse({ error: error.message }, error.status);
    if (error instanceof RateLimitError) {
      const response = jsonResponse({ error: 'Too many registrations' }, 429);
      response.headers.set('Retry-After', String(error.retryAfter)); return response;
    }
    // Request bodies contain private device tokens and must never be logged.
    return jsonResponse({ error: 'Live Activity registration is temporarily unavailable' }, 503);
  }
}
