'use server';

import { redirect } from 'next/navigation';
import { getAppData, saveAppData } from '@/lib/app-data';
import { verifyAdminCredentials } from '@/lib/auth';
import { saveUploadedImage } from '@/lib/upload';
import { getSession } from '@/lib/session';
import type { AdminTab, AppData } from '@/types';

async function requireSession() {
  const session = await getSession();
  if (!session.adminUserId) {
    redirect('/admin/login');
  }
}

export async function loginAction(formData: FormData) {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  const userId = await verifyAdminCredentials(username, password);
  if (!userId) {
    redirect('/admin/login?error=1');
  }

  const session = await getSession();
  session.adminUserId = userId;
  await session.save();
  redirect('/admin');
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect('/admin/login');
}

export async function saveFestivalAction(formData: FormData) {
  await requireSession();
  const data = await getAppData();

  data.festival = {
    ...data.festival,
    name: String(formData.get('name') ?? '').trim(),
    year: Number(formData.get('year') ?? 2026),
    startDate: String(formData.get('startDate') ?? '').trim(),
    endDate: String(formData.get('endDate') ?? '').trim(),
    location: String(formData.get('location') ?? '').trim(),
    locationShort: String(formData.get('locationShort') ?? '').trim(),
    ageRating: String(formData.get('ageRating') ?? '').trim(),
    heroImageUrl: String(formData.get('heroImageUrl') ?? '').trim() || undefined,
  };

  await saveAppData(data);
  redirect('/admin?tab=festival&ok=1');
}

export async function saveStagesAction(formData: FormData) {
  await requireSession();
  const data = await getAppData();
  const ids = formData.getAll('stage_id').map(String);
  const names = formData.getAll('stage_name').map(String);
  const shorts = formData.getAll('stage_short').map(String);
  const colors = formData.getAll('stage_color').map(String);

  data.stages = ids.map((id, index) => ({
    id: id.trim() as AppData['stages'][number]['id'],
    name: (names[index] ?? '').trim(),
    shortName: (shorts[index] ?? '').trim(),
    color: (colors[index] ?? '#FFFFFF').trim(),
  }));

  await saveAppData(data);
  redirect('/admin?tab=stages&ok=1');
}

export async function saveJsonTabAction(tab: AdminTab, formData: FormData) {
  await requireSession();
  const data = await getAppData();
  const json = String(formData.get('json') ?? '').trim();

  let decoded: unknown;
  try {
    decoded = JSON.parse(json);
  } catch {
    redirect(`/admin?tab=${tab}&error=${encodeURIComponent('Некорректный JSON')}`);
  }

  if (!Array.isArray(decoded)) {
    redirect(`/admin?tab=${tab}&error=${encodeURIComponent('Ожидается JSON-массив')}`);
  }

  if (tab === 'schedule') {
    data.schedule = decoded as AppData['schedule'];
  } else if (tab === 'autographs') {
    data.autographs = decoded as AppData['autographs'];
  } else if (tab === 'foodcourt') {
    data.foodcourt = decoded as AppData['foodcourt'];
  }

  await saveAppData(data);
  redirect(`/admin?tab=${tab}&ok=1`);
}

export async function uploadImageAction(formData: FormData) {
  await requireSession();
  const data = await getAppData();
  const target = String(formData.get('target') ?? '');
  const id = String(formData.get('id') ?? '');
  const file = formData.get('file');

  if (!(file instanceof File)) {
    redirect('/admin?error=' + encodeURIComponent('Файл не выбран'));
  }

  const url = await saveUploadedImage(file, 'images');
  if (!url) {
    redirect('/admin?error=' + encodeURIComponent('Не удалось загрузить файл'));
  }

  if (target === 'festival_hero') {
    data.festival.heroImageUrl = url;
  } else if (target === 'schedule' && id) {
    data.schedule = data.schedule.map((item) =>
      item.id === id ? { ...item, imageUrl: url } : item,
    );
  } else if (target === 'autograph' && id) {
    data.autographs = data.autographs.map((item) =>
      item.id === id ? { ...item, imageUrl: url } : item,
    );
  } else if (target === 'foodcourt' && id) {
    data.foodcourt = data.foodcourt.map((item) =>
      item.id === id ? { ...item, imageUrl: url } : item,
    );
  }

  await saveAppData(data);
  const tab =
    target === 'festival_hero'
      ? 'festival'
      : target === 'schedule'
        ? 'schedule'
        : target === 'autograph'
          ? 'autographs'
          : 'foodcourt';
  redirect(`/admin?tab=${tab}&ok=1`);
}

export async function loadAdminData(): Promise<AppData> {
  await requireSession();
  return getAppData();
}
