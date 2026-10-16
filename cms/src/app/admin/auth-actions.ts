'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { deleteAdminSession, verifyAdminCredentials } from '@/lib/auth';
import { getCurrentAdmin, getSession, startBrowserSession } from '@/lib/session';
import { grantVkAccess, revokeVkAccess } from '@/lib/admin-access';
import { RateLimitError, requestSource } from '@/lib/rate-limit';

export async function loginAction(formData: FormData) {
  let userId: number | null;
  try {
    userId = await verifyAdminCredentials(
      String(formData.get('username') ?? '').trim(),
      String(formData.get('password') ?? ''),
      requestSource(await headers()),
    );
  } catch (error) {
    if (error instanceof RateLimitError) redirect('/admin/login?error=rate');
    throw error;
  }
  if (!userId) redirect('/admin/login?error=1');
  await startBrowserSession(userId);
  redirect('/admin');
}

export async function logoutAction() {
  const session = await getSession();
  if (session.sessionToken) await deleteAdminSession(session.sessionToken);
  session.destroy();
  redirect('/admin/login');
}

async function requireOwner() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/admin/login');
  if (admin.role !== 'owner') throw new Error('Управление доступами доступно только владельцу.');
}

export async function grantVkAccessAction(formData: FormData) {
  await requireOwner();
  try {
    await grantVkAccess(
      String(formData.get('vkId') ?? ''),
      String(formData.get('displayName') ?? ''),
    );
  } catch (error) {
    const message =
      error instanceof Error && /Укажите|Имя должно/.test(error.message)
        ? error.message
        : 'Не удалось предоставить доступ. Проверьте настройки базы данных.';
    redirect('/admin?tab=access&error=' + encodeURIComponent(message));
  }
  redirect('/admin?tab=access&ok=1');
}

export async function revokeVkAccessAction(formData: FormData) {
  await requireOwner();
  await revokeVkAccess(Number(formData.get('userId')));
  redirect('/admin?tab=access&ok=1');
}
