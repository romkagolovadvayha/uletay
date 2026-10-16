import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function vkSettings() {
  const appId = process.env.VK_APP_ID?.trim() || '';
  const redirectUri = process.env.VK_REDIRECT_URI?.trim() || '';
  if (!/^[0-9]+$/.test(appId) || !redirectUri) throw new Error('VK ID is not configured');
  const url = new URL(redirectUri);
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (
    (!local && url.protocol !== 'https:') ||
    (local && !['http:', 'https:'].includes(url.protocol)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/admin/auth/vk/callback'
  ) {
    throw new Error('Invalid VK_REDIRECT_URI');
  }
  return { appId, redirectUri };
}

export function vkAuthConfigured(): boolean {
  try {
    vkSettings();
    return true;
  } catch {
    return false;
  }
}

export function createVkAuthorization() {
  const { appId, redirectUri } = vkSettings();
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const url = new URL('https://id.vk.ru/authorize');
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: appId,
    app_id: appId,
    redirect_uri: redirectUri,
    state,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 's256',
    scope: '',
    prompt: '',
    sdk_type: 'vkid',
    v: '2.6.1',
    stats_info: Buffer.from(
      JSON.stringify({
        flow_source: 'from_custom_auth',
        session_id: randomBytes(6).toString('hex'),
      }),
    ).toString('base64'),
  }).toString();
  return { url: url.toString(), state, verifier, expiresAt: Date.now() + 10 * 60_000 };
}

export function validVkState(expected: string, actual: string, expiresAt: number): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return (
    expected.length > 0 &&
    left.length === right.length &&
    expiresAt > Date.now() &&
    timingSafeEqual(left, right)
  );
}

async function vkPost(
  endpoint: string,
  query: URLSearchParams,
  body: URLSearchParams,
): Promise<Record<string, unknown>> {
  const response = await fetch(`https://id.vk.ru/oauth2/${endpoint}?${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  const result = await response.json();
  if (!response.ok || !result || typeof result !== 'object' || result.error)
    throw new Error('VK ID request failed');
  return result;
}

export async function exchangeVkCode(input: {
  code: string;
  verifier: string;
  deviceId: string;
  state: string;
}): Promise<string> {
  const { appId, redirectUri } = vkSettings();
  const token = await vkPost(
    'auth',
    new URLSearchParams({
      grant_type: 'authorization_code',
      code_verifier: input.verifier,
      client_id: appId,
      redirect_uri: redirectUri,
      device_id: input.deviceId,
      state: input.state,
    }),
    new URLSearchParams({ code: input.code }),
  );
  if (
    typeof token.access_token !== 'string' ||
    !token.access_token ||
    (token.state !== undefined && token.state !== input.state)
  )
    throw new Error('Invalid VK ID token response');
  // Only the server response establishes identity. A callback user_id is never trusted.
  const info = await vkPost(
    'user_info',
    new URLSearchParams({ client_id: appId }),
    new URLSearchParams({ access_token: token.access_token }),
  );
  const user = info.user as Record<string, unknown> | undefined;
  const id = user?.user_id;
  if (
    (typeof id !== 'number' && typeof id !== 'string') ||
    !/^[1-9][0-9]{0,19}$/.test(String(id)) ||
    (token.user_id !== undefined && String(token.user_id) !== String(id))
  )
    throw new Error('Invalid VK ID identity');
  return String(id);
}
