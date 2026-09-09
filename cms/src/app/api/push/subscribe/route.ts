import { NextRequest } from 'next/server';
import { jsonResponse, optionsResponse } from '@/lib/api-response';
import { config } from '@/lib/config';
import { readRequestJson, RequestJsonError } from '@/lib/request-json';
import { consumeRateLimit, RateLimitError, requestSource } from '@/lib/rate-limit';
import {
  registerExpoPushToken,
  registerRuStorePushToken,
  registerWebPushSubscription,
  unregisterPushSubscription,
} from '@/lib/push';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  return jsonResponse(
    {
      webPushSupported: Boolean(config.vapidPublicKey && config.vapidPrivateKey),
      vapidPublicKey: config.vapidPublicKey || null,
    },
    200,
  );
}

export async function POST(request: NextRequest) {
  try {
    consumeRateLimit('push-subscribe', requestSource(request.headers), 60, 60_000);
    const body = (await readRequestJson(request, 32_768)) as {
      platform?: 'ios' | 'android' | 'web';
      token?: string;
      provider?: 'expo' | 'rustore';
      subscription?: {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      favoriteKeys?: unknown;
    };
    const userAgent = request.headers.get('user-agent') ?? undefined;

    if (body.platform === 'web' && body.subscription) {
      await registerWebPushSubscription(body.subscription, userAgent, body.favoriteKeys);
    } else if (body.platform === 'android' && body.provider === 'rustore' && body.token) {
      await registerRuStorePushToken(body.token, userAgent);
    } else if ((body.platform === 'ios' || body.platform === 'android') && body.token) {
      await registerExpoPushToken(body.token, body.platform, userAgent);
    } else {
      return jsonResponse({ error: 'Invalid subscription payload' }, 400);
    }
    return jsonResponse({ ok: true });
  } catch (error) {
    if (error instanceof RequestJsonError) return jsonResponse({ error: error.message }, error.status);
    if (error instanceof RateLimitError) {
      const response = jsonResponse({ error: error.message }, 429);
      response.headers.set('Retry-After', String(error.retryAfter));
      return response;
    }
    console.error('Subscription registration failed', error);
    return jsonResponse({ error: 'Invalid subscription payload' }, 400);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    consumeRateLimit('push-unsubscribe', requestSource(request.headers), 60, 60_000);
    const body = (await readRequestJson(request, 8_192)) as {
      token?: string;
      endpoint?: string;
      provider?: 'expo' | 'rustore';
    };
    await unregisterPushSubscription(body);
    return jsonResponse({ ok: true });
  } catch (error) {
    if (error instanceof RequestJsonError) return jsonResponse({ error: error.message }, error.status);
    if (error instanceof RateLimitError) {
      const response = jsonResponse({ error: error.message }, 429);
      response.headers.set('Retry-After', String(error.retryAfter));
      return response;
    }
    return jsonResponse({ error: 'Unsubscribe error' }, 400);
  }
}
