'use server';

import { redirect } from 'next/navigation';
import {
  buildAutographId,
  buildFoodcourtId,
  buildScheduleId,
  uniqueId,
} from '@/lib/admin-ids';
import { getAppData, saveAppData } from '@/lib/app-data';
import { verifyAdminCredentials } from '@/lib/auth';
import type { ImagePreset } from '@/lib/image-presets';
import { ImageUploadError, saveUploadedImage } from '@/lib/upload';
import { getSession } from '@/lib/session';
import type {
  AdminTab,
  AppData,
  AutographSession,
  FoodCourtCategory,
  FoodCourtVendor,
  SchedulePerformance,
  StageId,
} from '@/types';

async function requireSession() {
  const session = await getSession();
  if (!session.adminUserId) {
    redirect('/admin/login');
  }
}

async function optionalImageUrl(
  formData: FormData,
  current?: string,
  preset: ImagePreset = 'artist',
): Promise<string | undefined> {
  const manual = String(formData.get('imageUrl') ?? '').trim();
  const file = formData.get('file');
  if (file instanceof File && file.size > 0) {
    return saveUploadedImage(file, 'images', preset);
  }
  return manual || current || undefined;
}

function uploadErrorMessage(error: unknown): string {
  if (error instanceof ImageUploadError) {
    return error.message;
  }
  return 'Не удалось загрузить файл';
}

function presetForUploadTarget(target: string): ImagePreset {
  if (target === 'festival_hero') {
    return 'hero';
  }
  if (target === 'foodcourt') {
    return 'thumb';
  }
  if (target === 'autograph') {
    return 'hero';
  }
  return 'artist';
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

export async function upsertScheduleAction(formData: FormData) {
  await requireSession();
  const data = await getAppData();
  const isNew = formData.get('isNew') === '1';
  const existingId = String(formData.get('id') ?? '').trim();
  const existing = data.schedule.find((item) => item.id === existingId);

  const stageId = String(formData.get('stageId') ?? '').trim() as StageId;
  const date = String(formData.get('date') ?? '').trim();
  const startTime = String(formData.get('startTime') ?? '').trim();
  const endTime = String(formData.get('endTime') ?? '').trim();
  const artist = String(formData.get('artist') ?? '').trim();
  const isCompetition = formData.get('isCompetition') === '1';

  if (!stageId || !date || !startTime || !endTime || !artist) {
    redirect('/admin?tab=schedule&error=' + encodeURIComponent('Заполните все обязательные поля'));
  }

  const ids = new Set(data.schedule.map((item) => item.id));
  const id = isNew
    ? uniqueId(buildScheduleId(stageId, date, startTime, artist), ids)
    : existingId;

  let imageUrl: string | undefined;
  try {
    imageUrl = await optionalImageUrl(formData, existing?.imageUrl, 'artist');
  } catch (error) {
    redirect('/admin?tab=schedule&error=' + encodeURIComponent(uploadErrorMessage(error)));
  }

  const item: SchedulePerformance = {
    id,
    stageId,
    date,
    startTime,
    endTime,
    artist,
    ...(isCompetition ? { isCompetition: true } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  };

  if (isNew) {
    data.schedule.push(item);
  } else {
    const index = data.schedule.findIndex((row) => row.id === existingId);
    if (index === -1) {
      redirect('/admin?tab=schedule&error=' + encodeURIComponent('Запись не найдена'));
    }
    data.schedule[index] = item;
  }

  await saveAppData(data);
  redirect('/admin?tab=schedule&ok=1');
}

export async function deleteScheduleAction(formData: FormData) {
  await requireSession();
  const data = await getAppData();
  const id = String(formData.get('id') ?? '').trim();
  data.schedule = data.schedule.filter((item) => item.id !== id);
  await saveAppData(data);
  redirect('/admin?tab=schedule&ok=1');
}

export async function upsertAutographAction(formData: FormData) {
  await requireSession();
  const data = await getAppData();
  const isNew = formData.get('isNew') === '1';
  const existingId = String(formData.get('id') ?? '').trim();
  const existing = data.autographs.find((item) => item.id === existingId);

  const stageId = String(formData.get('stageId') ?? '').trim() as StageId;
  const date = String(formData.get('date') ?? '').trim();
  const startTime = String(formData.get('startTime') ?? '').trim();
  const endTime = String(formData.get('endTime') ?? '').trim();
  const artist = String(formData.get('artist') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();

  if (!stageId || !date || !startTime || !endTime || !artist) {
    redirect('/admin?tab=autographs&error=' + encodeURIComponent('Заполните все обязательные поля'));
  }

  const ids = new Set(data.autographs.map((item) => item.id));
  const id = isNew
    ? uniqueId(buildAutographId(stageId, date, startTime, artist), ids)
    : existingId;

  let imageUrl: string | undefined;
  try {
    imageUrl = await optionalImageUrl(formData, existing?.imageUrl, 'hero');
  } catch (error) {
    redirect('/admin?tab=autographs&error=' + encodeURIComponent(uploadErrorMessage(error)));
  }

  const item: AutographSession = {
    id,
    stageId,
    date,
    startTime,
    endTime,
    artist,
    ...(location ? { location } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  };

  if (isNew) {
    data.autographs.push(item);
  } else {
    const index = data.autographs.findIndex((row) => row.id === existingId);
    if (index === -1) {
      redirect('/admin?tab=autographs&error=' + encodeURIComponent('Запись не найдена'));
    }
    data.autographs[index] = item;
  }

  await saveAppData(data);
  redirect('/admin?tab=autographs&ok=1');
}

export async function deleteAutographAction(formData: FormData) {
  await requireSession();
  const data = await getAppData();
  const id = String(formData.get('id') ?? '').trim();
  data.autographs = data.autographs.filter((item) => item.id !== id);
  await saveAppData(data);
  redirect('/admin?tab=autographs&ok=1');
}

export async function upsertFoodcourtAction(formData: FormData) {
  await requireSession();
  const data = await getAppData();
  const isNew = formData.get('isNew') === '1';
  const existingId = String(formData.get('id') ?? '').trim();
  const existing = data.foodcourt.find((item) => item.id === existingId);

  const name = String(formData.get('name') ?? '').trim();
  const category = String(formData.get('category') ?? 'hot') as FoodCourtCategory;
  const description = String(formData.get('description') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();
  const hours = String(formData.get('hours') ?? '').trim();
  const priceFrom = String(formData.get('priceFrom') ?? '').trim();
  const priceRange = String(formData.get('priceRange') ?? '').trim();
  const distance = String(formData.get('distance') ?? '').trim();
  const imageTint = String(formData.get('imageTint') ?? '#5C3D2E').trim();

  if (!name || !description || !location || !hours || !priceFrom || !distance) {
    redirect('/admin?tab=foodcourt&error=' + encodeURIComponent('Заполните все обязательные поля'));
  }

  const id = isNew ? buildFoodcourtId() : existingId;

  let imageUrl: string | undefined;
  try {
    imageUrl = await optionalImageUrl(formData, existing?.imageUrl, 'thumb');
  } catch (error) {
    redirect('/admin?tab=foodcourt&error=' + encodeURIComponent(uploadErrorMessage(error)));
  }

  const item: FoodCourtVendor = {
    id,
    name,
    category,
    description,
    location,
    hours,
    priceFrom,
    distance,
    imageTint,
    ...(priceRange ? { priceRange } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  };

  if (isNew) {
    data.foodcourt.push(item);
  } else {
    const index = data.foodcourt.findIndex((row) => row.id === existingId);
    if (index === -1) {
      redirect('/admin?tab=foodcourt&error=' + encodeURIComponent('Запись не найдена'));
    }
    data.foodcourt[index] = item;
  }

  await saveAppData(data);
  redirect('/admin?tab=foodcourt&ok=1');
}

export async function deleteFoodcourtAction(formData: FormData) {
  await requireSession();
  const data = await getAppData();
  const id = String(formData.get('id') ?? '').trim();
  data.foodcourt = data.foodcourt.filter((item) => item.id !== id);
  await saveAppData(data);
  redirect('/admin?tab=foodcourt&ok=1');
}

export async function uploadImageAction(formData: FormData) {
  await requireSession();
  const data = await getAppData();
  const target = String(formData.get('target') ?? '');
  const id = String(formData.get('id') ?? '');
  const file = formData.get('file');
  const tab: AdminTab =
    target === 'festival_hero'
      ? 'festival'
      : target === 'schedule'
        ? 'schedule'
        : target === 'autograph'
          ? 'autographs'
          : 'foodcourt';

  if (!(file instanceof File)) {
    redirect('/admin?tab=' + tab + '&error=' + encodeURIComponent('Файл не выбран'));
  }

  let url: string;
  try {
    url = await saveUploadedImage(file, 'images', presetForUploadTarget(target));
  } catch (error) {
    redirect('/admin?tab=' + tab + '&error=' + encodeURIComponent(uploadErrorMessage(error)));
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
  redirect(`/admin?tab=${tab}&ok=1`);
}

export async function loadAdminData(): Promise<AppData> {
  await requireSession();
  return getAppData();
}
