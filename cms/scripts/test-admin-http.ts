import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { sealData } from 'iron-session';

async function main() {
  const origin = process.env.TEST_CMS_URL || '';
  const url = new URL(origin);
  if (
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    !process.env.DB_NAME?.startsWith('uletay_test_') ||
    !process.env.SESSION_SECRET
  ) {
    throw new Error(
      'Use an isolated local CMS and a uletay_test_* database with explicit test settings.',
    );
  }
  const auth = await import('../src/lib/auth');
  const access = await import('../src/lib/admin-access');
  const { getPool } = await import('../src/lib/db');
  const username = process.env.ADMIN_USER || 'admin';
  const password = process.env.ADMIN_PASSWORD || '';
  const vkId = String(900000000000 + Math.floor(Math.random() * 100000000));
  let editorId: number | undefined;
  async function request(route: string, init: RequestInit = {}) {
    return fetch(new URL(route, origin), { ...init, redirect: 'manual' });
  }
  async function cookie(id: number, token: string) {
    return (
      'uletay_admin=' +
      (await sealData(
        { adminUserId: id, sessionToken: token },
        { password: process.env.SESSION_SECRET!, ttl: 3600 },
      ))
    );
  }
  try {
    assert.equal((await request('/admin')).status, 307);
    assert.equal((await request('/api/upload', { method: 'POST' })).status, 401);
    const bad = await request('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ username, password: randomBytes(12).toString('hex') }),
    });
    assert.equal(bad.status, 401);
    const login = await request('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    assert.equal(login.status, 200);
    const ownerToken = (await login.json()).token;
    const ownerId = await auth.verifyAdminCredentials(username, password, 'test-http');
    assert(ownerId);
    const ownerCookie = await cookie(ownerId, ownerToken);
    const page = await request('/admin?tab=access', { headers: { Cookie: ownerCookie } });
    assert.equal(page.status, 200);
    const html = await page.text();
    const grantForm = html
      .match(/<form\b[^>]*>[\s\S]*?<\/form>/g)
      ?.find((item) => item.includes('name="vkId"'));
    const actionId = grantForm?.match(/name="(\$ACTION_ID_[a-f0-9]+)"/)?.[1];
    assert(actionId, 'The owner must receive the grant-access server action');
    await access.grantVkAccess(vkId, 'HTTP test editor');
    const editor = await access.findAdminByVkId(vkId);
    assert(editor);
    editorId = editor.id;
    const editorToken = await auth.createAdminSession(editor.id);
    const editorCookie = await cookie(editor.id, editorToken);
    const editorPage = await request('/admin', { headers: { Cookie: editorCookie } });
    assert.equal(editorPage.status, 200);
    assert(
      !(await editorPage.text()).includes('href="/admin?tab=access"'),
      'Access management is absent for editors',
    );
    assert.equal(
      (await request('/admin?tab=access', { headers: { Cookie: editorCookie } })).status,
      307,
    );
    // Calling the owner's server action directly must still enforce the role.
    const forbiddenId = String(Number(vkId) + 1);
    const form = new FormData();
    form.set(actionId, '');
    form.set('vkId', forbiddenId);
    form.set('displayName', 'Forbidden grant');
    const denied = await request('/admin?tab=access', {
      method: 'POST',
      headers: { Cookie: editorCookie, Origin: origin },
      body: form,
    });
    assert(denied.status >= 400);
    assert.equal(await access.findAdminByVkId(forbiddenId), null);
    assert.equal(
      (
        await request('/api/upload', {
          method: 'POST',
          headers: { Cookie: editorCookie, Origin: 'https://foreign.invalid' },
          body: new FormData(),
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await request('/api/upload', {
          method: 'POST',
          headers: { Cookie: editorCookie, Origin: origin },
          body: new FormData(),
        })
      ).status,
      400,
    );
    await access.revokeVkAccess(editor.id);
    assert.equal((await request('/admin', { headers: { Cookie: editorCookie } })).status, 307);
    assert.equal(
      (
        await request('/api/data', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${editorToken}` },
          body: '{}',
        })
      ).status,
      401,
    );
    const callback = await request('/admin/auth/vk/callback?state=fake&code=fake&device_id=fake');
    assert.equal(callback.status, 307);
    assert(callback.headers.get('location')?.includes('error=vk'));
    await auth.deleteAdminSession(ownerToken);
    assert.equal((await request('/admin', { headers: { Cookie: ownerCookie } })).status, 307);
    console.log(
      'Admin HTTP: login, anonymous access, editor permissions, direct server action, upload Origin, revoked cookies/tokens and invalid VK callback passed.',
    );
  } finally {
    if (editorId) {
      await getPool().execute('DELETE FROM admin_sessions WHERE user_id = ?', [editorId]);
      await getPool().execute('DELETE FROM admin_users WHERE id = ? AND vk_id = ?', [
        editorId,
        vkId,
      ]);
    }
    await getPool().end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
