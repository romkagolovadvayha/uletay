import { NextRequest } from 'next/server';
import { jsonResponse, optionsResponse } from '@/lib/api-response';
import { config } from '@/lib/config';
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
    const body = (await request.json()) as {
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
    const message = error instanceof Error ? error.message : 'Subscription error';
    return jsonResponse({ error: message }, 400);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      token?: string;
      endpoint?: string;
      provider?: 'expo' | 'rustore';
    };
    await unregisterPushSubscription(body);
    return jsonResponse({ ok: true });
  } catch {
    return jsonResponse({ error: 'Unsubscribe error' }, 400);
  }
}
