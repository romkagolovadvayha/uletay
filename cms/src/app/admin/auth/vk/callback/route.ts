import { NextRequest, NextResponse } from 'next/server';
import { exchangeVkCode, validVkState, vkSettings } from '@/lib/vk-auth';
import { getSession, startBrowserSession } from '@/lib/session';
import { findAdminByVkId } from '@/lib/admin-access';

export async function GET(request: NextRequest) {
  let destination = '/admin/login?error=vk';
  try {
    const session = await getSession();
    const pending = session.vkOAuth;
    delete session.vkOAuth;
    await session.save();
    const params = request.nextUrl.searchParams;
    const state = params.get('state') || '';
    const code = params.get('code') || '';
    const deviceId = params.get('device_id') || '';
    if (
      !pending ||
      !validVkState(pending.state, state, pending.expiresAt) ||
      params.has('error') ||
      !code ||
      code.length > 4096 ||
      !deviceId ||
      deviceId.length > 512
    ) {
      throw new Error('Invalid VK callback');
    }
    const vkId = await exchangeVkCode({ code, verifier: pending.verifier, deviceId, state });
    const admin = await findAdminByVkId(vkId);
    if (admin) {
      await startBrowserSession(admin.id);
      destination = '/admin';
    } else {
      destination = '/admin/login?error=vk-denied';
    }
  } catch {
    // Tokens and authorization codes must not appear in logs or the redirect URL.
  }
  let origin = request.nextUrl.origin;
  try {
    origin = new URL(vkSettings().redirectUri).origin;
  } catch {
    /* local configuration error */
  }
  const response = NextResponse.redirect(new URL(destination, origin));
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
