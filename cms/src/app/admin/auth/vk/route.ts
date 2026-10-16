import { NextRequest, NextResponse } from 'next/server';
import { createVkAuthorization } from '@/lib/vk-auth';
import { getSession } from '@/lib/session';
import { consumeRateLimit, RateLimitError, requestSource } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    consumeRateLimit('vk-login', requestSource(request.headers), 30, 15 * 60_000);
    const { url, ...pending } = createVkAuthorization();
    const session = await getSession();
    session.vkOAuth = pending;
    await session.save();
    const response = NextResponse.redirect(url);
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  } catch (error) {
    const code = error instanceof RateLimitError ? 'rate' : 'vk-config';
    return NextResponse.redirect(new URL(`/admin/login?error=${code}`, request.url));
  }
}
