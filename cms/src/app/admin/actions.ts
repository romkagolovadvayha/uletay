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
import { buildHeadlinerId, collectHeadlinerYears } from '@/lib/headliners';
import { enrichHeadlinerFromLastFm } from '@/lib/headliner-lastfm-sync';
import type { ImagePreset } from '@/lib/image-presets';
import { ImageUploadError, saveUploadedImage, saveUploadedMapScheme } from '@/lib/upload';
import { getSession } from '@/lib/session';
import { capPerformanceEndTime } from '@/lib/schedule-time';
import type {
  AdminTab,
  AppData,
  AutographSession,
  FoodCourtCategory,
  FoodCourtVendor,
  Headliner,
  MapPathsGeoJson,
  MapZonesGeoJson,
  SchedulePerformance,
  StageId,
} from '@/types';
import { defaultOverlayFromBounds } from '@/lib/map-overlay-georef';

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
  if (target === 'festival_logo') {
    return 'logo';
  }
  if (target === 'foodcourt') {
    return 'thumb';
  }
  if (target === 'headliner') {
    return 'artist';
  }
  if (target === 'autograph') {
    return 'hero';
  }
  return 'artist';
}

function parseYearsInput(raw: string): number[] {
  return [...new Set(
    raw
      .split(/[,;\s]+/)
      .map((part) => Number(part.trim()))
      .filter((year) => Number.isInteger(year) && year >= 2000 && year <= 2100),
  )].sort((a, b) => b - a);
}

function resolveHeadlinerArtist(data: AppData, headlinerId: string): string {
  const headliner = data.headliners.find((item) => item.id === headlinerId);
  if (!headliner) {
    throw new Error('Хэдлайнер не найден');
  }
  return headliner.name;
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
    heroImageUrl: String(formData.get('heroImageUrl') ?? '').trim() || data.festival.heroImageUrl,
    logoImageUrl: String(formData.get('logoImageUrl') ?? '').trim() || data.festival.logoImageUrl,
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

  const stageId = String(formData.get('stageId') ?? '').trim() as StageId;
  const date = String(formData.get('date') ?? '').trim();
  const startTime = String(formData.get('startTime') ?? '').trim();
  const rawEndTime = String(formData.get('endTime') ?? '').trim();
  const headlinerId = String(formData.get('headlinerId') ?? '').trim();
  const isCompetition = formData.get('isCompetition') === '1';

  if (!stageId || !date || !startTime || !rawEndTime || !headlinerId) {
    redirect('/admin?tab=schedule&error=' + encodeURIComponent('Заполните все обязательные поля'));
  }

  let artist: string;
  try {
    artist = resolveHeadlinerArtist(data, headlinerId);
  } catch {
    redirect('/admin?tab=schedule&error=' + encodeURIComponent('Выберите артиста из списка хэдлайнеров'));
  }

  const endTime = capPerformanceEndTime(startTime, rawEndTime);

  const ids = new Set(data.schedule.map((item) => item.id));
  const id = isNew
    ? uniqueId(buildScheduleId(stageId, date, startTime, artist), ids)
    : existingId;

  const item: SchedulePerformance = {
    id,
    stageId,
    date,
    startTime,
    endTime,
    headlinerId,
    artist,
    ...(isCompetition ? { isCompetition: true } : {}),
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

  const stageId = String(formData.get('stageId') ?? '').trim() as StageId;
  const date = String(formData.get('date') ?? '').trim();
  const startTime = String(formData.get('startTime') ?? '').trim();
  const endTime = String(formData.get('endTime') ?? '').trim();
  const headlinerId = String(formData.get('headlinerId') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();

  if (!stageId || !date || !startTime || !endTime || !headlinerId) {
    redirect('/admin?tab=autographs&error=' + encodeURIComponent('Заполните все обязательные поля'));
  }

  let artist: string;
  try {
    artist = resolveHeadlinerArtist(data, headlinerId);
  } catch {
    redirect('/admin?tab=autographs&error=' + encodeURIComponent('Выберите артиста из списка хэдлайнеров'));
  }

  const ids = new Set(data.autographs.map((item) => item.id));
  const id = isNew
    ? uniqueId(buildAutographId(stageId, date, startTime, artist), ids)
    : existingId;

  const item: AutographSession = {
    id,
    stageId,
    date,
    startTime,
    endTime,
    headlinerId,
    artist,
    ...(location ? { location } : {}),
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
    ...(imageUrl ? { imageUrl } : existing?.imageUrl ? { imageUrl: existing.imageUrl } : {}),
    ...(existing?.legalName ? { legalName: existing.legalName } : {}),
    ...(existing?.contacts ? { contacts: existing.contacts } : {}),
    ...(existing?.notes ? { notes: existing.notes } : {}),
    ...(existing?.menu?.length ? { menu: existing.menu } : {}),
    ...(existing?.menuImageUrls?.length ? { menuImageUrls: existing.menuImageUrls } : {}),
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

export async function reorderFoodcourtAction(
  ids: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireSession();

  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: 'Пустой список' };
  }

  const data = await getAppData();
  const byId = new Map(data.foodcourt.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const reordered: FoodCourtVendor[] = [];

  for (const id of ids) {
    if (typeof id !== 'string' || !id.trim() || seen.has(id)) {
      continue;
    }
    const item = byId.get(id);
    if (!item) {
      return { ok: false, error: 'Неизвестная запись' };
    }
    seen.add(id);
    reordered.push(item);
  }

  for (const item of data.foodcourt) {
    if (!seen.has(item.id)) {
      reordered.push(item);
    }
  }

  data.foodcourt = reordered;
  await saveAppData(data);
  return { ok: true };
}

export async function upsertHeadlinerAction(formData: FormData) {
  await requireSession();
  const data = await getAppData();
  const isNew = formData.get('isNew') === '1';
  const existingId = String(formData.get('id') ?? '').trim();
  const existing = data.headliners.find((item) => item.id === existingId);

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || name;
  const imageTint = String(formData.get('imageTint') ?? '#4A1C1C').trim();
  const manualYears = parseYearsInput(String(formData.get('years') ?? ''));

  if (!name) {
    redirect('/admin?tab=headliners&error=' + encodeURIComponent('Укажите имя артиста'));
  }

  const ids = new Set(data.headliners.map((item) => item.id));
  const id = isNew ? uniqueId(buildHeadlinerId(name), ids) : existingId;

  let imageUrl: string | undefined;
  try {
    imageUrl = await optionalImageUrl(formData, existing?.imageUrl, 'artist');
  } catch (error) {
    redirect('/admin?tab=headliners&error=' + encodeURIComponent(uploadErrorMessage(error)));
  }

  const linkedYears = collectHeadlinerYears(id, data.schedule, data.autographs);
  const years = manualYears.length
    ? [...new Set([...manualYears, ...linkedYears])].sort((a, b) => b - a)
    : linkedYears;

  let item: Headliner = {
    id,
    name,
    description,
    imageTint,
    years,
    ...(imageUrl ? { imageUrl } : {}),
  };

  if (isNew || !existing?.lastfm) {
    try {
      item = await enrichHeadlinerFromLastFm(item);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Last.fm sync failed for ${name}: ${message}`);
    }
  }

  if (isNew) {
    data.headliners.push(item);
  } else {
    const index = data.headliners.findIndex((row) => row.id === existingId);
    if (index === -1) {
      redirect('/admin?tab=headliners&error=' + encodeURIComponent('Запись не найдена'));
    }
    data.headliners[index] = item;
  }

  await saveAppData(data);
  redirect('/admin?tab=headliners&ok=1');
}

export async function deleteHeadlinerAction(formData: FormData) {
  await requireSession();
  const data = await getAppData();
  const id = String(formData.get('id') ?? '').trim();

  const usedInSchedule = data.schedule.some((item) => item.headlinerId === id);
  const usedInAutographs = data.autographs.some((item) => item.headlinerId === id);
  if (usedInSchedule || usedInAutographs) {
    redirect(
      '/admin?tab=headliners&error=' +
        encodeURIComponent('Артист используется в расписании или автографах'),
    );
  }

  data.headliners = data.headliners.filter((item) => item.id !== id);
  await saveAppData(data);
  redirect('/admin?tab=headliners&ok=1');
}

export async function reorderHeadlinersAction(
  ids: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireSession();

  if (!Array.isArray(ids) || ids.length === 0) {
    return { ok: false, error: 'Пустой список' };
  }

  const data = await getAppData();
  const byId = new Map(data.headliners.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const reordered: Headliner[] = [];

  for (const id of ids) {
    if (typeof id !== 'string' || !id.trim() || seen.has(id)) {
      continue;
    }
    const item = byId.get(id);
    if (!item) {
      return { ok: false, error: 'Неизвестная запись' };
    }
    seen.add(id);
    reordered.push(item);
  }

  for (const item of data.headliners) {
    if (!seen.has(item.id)) {
      reordered.push(item);
    }
  }

  data.headliners = reordered;
  await saveAppData(data);
  return { ok: true };
}

function parseGeoJson<T>(raw: FormDataEntryValue | null, label: string): T {
  try {
    return JSON.parse(String(raw ?? '')) as T;
  } catch {
    redirect('/admin?tab=map&error=' + encodeURIComponent(`Некорректный JSON: ${label}`));
    throw new Error('unreachable');
  }
}

export async function saveMapConfigAction(formData: FormData) {
  await requireSession();
  const data = await getAppData();
  const existing = data.festivalMap;

  const swLat = String(formData.get('swLat') ?? '').trim();
  const swLng = String(formData.get('swLng') ?? '').trim();
  const neLat = String(formData.get('neLat') ?? '').trim();
  const neLng = String(formData.get('neLng') ?? '').trim();

  const center = {
    lat: Number(formData.get('centerLat') ?? existing?.center.lat ?? 56.606975),
    lng: Number(formData.get('centerLng') ?? existing?.center.lng ?? 53.622461),
  };

  const territoryBounds =
    swLat && swLng && neLat && neLng
      ? {
          sw: { lat: Number(swLat), lng: Number(swLng) },
          ne: { lat: Number(neLat), lng: Number(neLng) },
        }
      : existing?.territoryBounds;

  data.festivalMap = {
    enabled: formData.get('enabled') === '1',
    defaultZoom: Number(formData.get('defaultZoom') ?? existing?.defaultZoom ?? 14),
    center,
    ...(territoryBounds ? { territoryBounds } : {}),
    ...(existing?.adminOverlay ? { adminOverlay: existing.adminOverlay } : {}),
  };

  await saveAppData(data);
  redirect('/admin?tab=map&ok=1');
}

export async function uploadMapSchemeAction(formData: FormData) {
  await requireSession();
  const data = await getAppData();
  const file = formData.get('file');

  if (!(file instanceof File) || file.size === 0) {
    redirect('/admin?tab=map&error=' + encodeURIComponent('Выберите PNG/JPEG файл'));
  }

  let uploaded: { url: string; width: number; height: number };
  try {
    uploaded = await saveUploadedMapScheme(file);
  } catch (error) {
    redirect('/admin?tab=map&error=' + encodeURIComponent(uploadErrorMessage(error)));
  }

  const existingMap = data.festivalMap;
  const center = existingMap?.center ?? { lat: 56.606975, lng: 53.622461 };
  const aspectRatio = uploaded.height / uploaded.width;
  const prev = existingMap?.adminOverlay;

  const adminOverlay = prev
    ? {
        ...prev,
        imageUrl: uploaded.url,
        aspectRatio,
      }
    : defaultOverlayFromBounds(
        uploaded.url,
        center,
        existingMap?.territoryBounds,
        aspectRatio,
      );

  data.festivalMap = {
    enabled: existingMap?.enabled ?? true,
    defaultZoom: existingMap?.defaultZoom ?? 14,
    center,
    territoryBounds: existingMap?.territoryBounds,
    adminOverlay,
  };

  await saveAppData(data);
  redirect('/admin?tab=map&ok=1');
}

export async function saveMapOverlayGeorefAction(formData: FormData) {
  await requireSession();
  const data = await getAppData();
  const existing = data.festivalMap?.adminOverlay;

  if (!existing?.imageUrl) {
    redirect('/admin?tab=map&error=' + encodeURIComponent('Сначала загрузите схему'));
  }

  const centerLat = Number(formData.get('centerLat'));
  const centerLng = Number(formData.get('centerLng'));
  const widthMeters = Number(formData.get('widthMeters'));
  const aspectRatio = Number(formData.get('aspectRatio'));
  const rotation = Number(formData.get('rotation'));
  const opacity = Number(formData.get('opacity'));

  if (
    !Number.isFinite(centerLat) ||
    !Number.isFinite(centerLng) ||
    !Number.isFinite(widthMeters) ||
    widthMeters <= 0
  ) {
    redirect('/admin?tab=map&error=' + encodeURIComponent('Некорректные параметры привязки'));
  }

  data.festivalMap = {
    enabled: data.festivalMap?.enabled ?? true,
    defaultZoom: data.festivalMap?.defaultZoom ?? 14,
    center: data.festivalMap?.center ?? { lat: centerLat, lng: centerLng },
    territoryBounds: data.festivalMap?.territoryBounds,
    adminOverlay: {
      imageUrl: existing.imageUrl,
      center: { lat: centerLat, lng: centerLng },
      widthMeters,
      aspectRatio: Number.isFinite(aspectRatio) ? aspectRatio : existing.aspectRatio ?? 0.72,
      rotation: Number.isFinite(rotation) ? rotation : 0,
      opacity: Number.isFinite(opacity) ? opacity : existing.opacity ?? 0.5,
    },
  };

  await saveAppData(data);
  redirect('/admin?tab=map&ok=1');
}

export async function removeMapSchemeAction(_formData: FormData) {
  await requireSession();
  const data = await getAppData();
  if (data.festivalMap) {
    const { adminOverlay: _removed, ...rest } = data.festivalMap;
    data.festivalMap = rest;
  }
  await saveAppData(data);
  redirect('/admin?tab=map&ok=1');
}

export async function saveMapLayersAction(formData: FormData) {
  await requireSession();
  const data = await getAppData();

  data.mapZones = parseGeoJson<MapZonesGeoJson>(formData.get('mapZones'), 'зоны');
  data.mapPaths = parseGeoJson<MapPathsGeoJson>(formData.get('mapPaths'), 'дорожки');

  await saveAppData(data);
  redirect('/admin?tab=map&ok=1');
}

export async function saveMapGeoJsonAction(formData: FormData) {
  await requireSession();
  const data = await getAppData();

  data.mapZones = parseGeoJson<MapZonesGeoJson>(formData.get('mapZones'), 'зоны');
  data.mapPaths = parseGeoJson<MapPathsGeoJson>(formData.get('mapPaths'), 'дорожки');

  await saveAppData(data);
  redirect('/admin?tab=map&ok=1');
}

export async function uploadImageAction(formData: FormData) {
  await requireSession();
  const data = await getAppData();
  const target = String(formData.get('target') ?? '');
  const id = String(formData.get('id') ?? '');
  const file = formData.get('file');
  const tab: AdminTab =
    target === 'festival_hero' || target === 'festival_logo'
      ? 'festival'
      : target === 'schedule'
        ? 'schedule'
        : target === 'autograph'
          ? 'autographs'
          : target === 'headliner'
            ? 'headliners'
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
  } else if (target === 'festival_logo') {
    data.festival.logoImageUrl = url;
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
  } else if (target === 'headliner' && id) {
    data.headliners = data.headliners.map((item) =>
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
