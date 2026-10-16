import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  createVkAuthorization,
  exchangeVkCode,
  validVkState,
  vkAuthConfigured,
} from '../src/lib/vk-auth';
import { parseVkId } from '../src/lib/admin-access';
import { isSameOriginRequest } from '../src/lib/request-origin';

async function main() {
  process.env.VK_APP_ID = '123456';
  process.env.VK_REDIRECT_URI = 'http://localhost:3000/admin/auth/vk/callback';
  assert(vkAuthConfigured());
  const previousProxy = process.env.TRUST_PROXY;
  process.env.TRUST_PROXY = '1';
  assert(
    isSameOriginRequest(
      new Request('http://127.0.0.1:3000/api/upload', {
        headers: { Host: 'example.ru', Origin: 'https://example.ru', 'X-Forwarded-Proto': 'https' },
      }),
    ),
  );
  assert(
    !isSameOriginRequest(
      new Request('http://127.0.0.1:3000/api/upload', {
        headers: { Host: 'example.ru', Origin: 'https://foreign.ru', 'X-Forwarded-Proto': 'https' },
      }),
    ),
  );
  if (previousProxy === undefined) delete process.env.TRUST_PROXY;
  else process.env.TRUST_PROXY = previousProxy;
  const first = createVkAuthorization();
  const second = createVkAuthorization();
  assert.notEqual(first.state, second.state);
  assert.notEqual(first.verifier, second.verifier);
  const url = new URL(first.url);
  assert.equal(url.origin, 'https://id.vk.ru');
  assert.equal(
    url.searchParams.get('code_challenge'),
    createHash('sha256').update(first.verifier).digest('base64url'),
  );
  assert(!url.searchParams.has('code_verifier'));
  assert(validVkState(first.state, first.state, first.expiresAt));
  assert(!validVkState(first.state, second.state, first.expiresAt));
  assert(!validVkState(first.state, first.state, Date.now() - 1));
  assert(!validVkState('', '', first.expiresAt));
  assert.equal(parseVkId(' id12345 '), '12345');
  for (const value of [
    '',
    '0',
    '-1',
    'name',
    'https://vk.com/id12',
    '1 OR 1=1',
    '1.2',
    '1e3',
    '1'.repeat(21),
  ]) {
    assert.throws(() => parseVkId(value));
  }
  for (const uri of [
    'http://example.com/admin/auth/vk/callback',
    'https://example.com/wrong',
    'https://example.com/admin/auth/vk/callback?x=1',
  ]) {
    process.env.VK_REDIRECT_URI = uri;
    assert(!vkAuthConfigured());
  }
  process.env.VK_REDIRECT_URI = 'http://localhost:3000/admin/auth/vk/callback';
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (input, options) => {
    const target = new URL(String(input));
    const body = options?.body as URLSearchParams;
    calls++;
    if (target.pathname.endsWith('/auth')) {
      assert.equal(target.searchParams.get('code_verifier'), first.verifier);
      assert.equal(target.searchParams.get('device_id'), 'test-device');
      assert.equal(body.get('code'), 'authorization-code');
      return Response.json({
        access_token: 'test-only-access-token',
        user_id: 12345,
        state: first.state,
      });
    }
    assert.equal(target.pathname, '/oauth2/user_info');
    assert.equal(body.get('access_token'), 'test-only-access-token');
    return Response.json({ user: { user_id: '12345' } });
  };
  const input = {
    code: 'authorization-code',
    verifier: first.verifier,
    deviceId: 'test-device',
    state: first.state,
  };
  try {
    assert.equal(await exchangeVkCode(input), '12345');
    assert.equal(calls, 2);
    globalThis.fetch = async () => Response.json({ access_token: 'test', state: 'wrong' });
    await assert.rejects(exchangeVkCode(input), /token response/);
    globalThis.fetch = async (target) =>
      String(target).includes('/user_info')
        ? Response.json({ user: { user_id: '54321' } })
        : Response.json({ access_token: 'test', user_id: '12345', state: first.state });
    await assert.rejects(exchangeVkCode(input), /identity/);
    globalThis.fetch = async () => Response.json({ error: 'invalid_grant' }, { status: 400 });
    await assert.rejects(exchangeVkCode(input));
  } finally {
    globalThis.fetch = originalFetch;
  }
  console.log(
    'VK authentication: PKCE, state, expiry, callback identity and invalid responses passed.',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
