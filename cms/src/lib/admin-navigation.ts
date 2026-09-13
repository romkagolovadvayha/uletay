import type { AdminTab, AppData } from '@/types';

export const adminSections = [
  {
    key: 'overview',
    label: 'Обзор',
    icon: 'grid',
    group: 'Рабочее пространство',
    description: 'Всё важное о содержимом приложения — в одном месте.',
  },
  {
    key: 'schedule',
    label: 'Расписание',
    icon: 'calendar',
    group: 'Программа',
    description: 'Выступления, даты и время выхода на сцену.',
  },
  {
    key: 'headliners',
    label: 'Артисты',
    icon: 'star',
    group: 'Программа',
    description: 'Фотографии, описания и годы участия.',
  },
  {
    key: 'autographs',
    label: 'Автограф-сессии',
    icon: 'autographs',
    group: 'Программа',
    description: 'Встречи с артистами и места проведения.',
  },
  {
    key: 'stages',
    label: 'Сцены',
    icon: 'stages',
    group: 'Программа',
    description: 'Названия и цвета сцен в приложении.',
  },
  {
    key: 'map',
    label: 'Карта территории',
    icon: 'map',
    group: 'Площадка',
    description: 'Объекты, маршруты и схема фестиваля.',
  },
  {
    key: 'foodcourt',
    label: 'Фудкорт',
    icon: 'food',
    group: 'Площадка',
    description: 'Точки питания, меню, цены и часы работы.',
  },
  {
    key: 'push',
    label: 'Уведомления',
    icon: 'bell',
    group: 'Управление',
    description: 'Сообщения подписчикам и история отправок.',
  },
  {
    key: 'festival',
    label: 'Настройки фестиваля',
    icon: 'festival',
    group: 'Управление',
    description: 'Название, даты, место проведения и оформление.',
  },
] as const;

export type AdminSearchItem = { title: string; detail: string; href: string; keywords?: string };
export function adminHref(tab: AdminTab, params: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams({ tab });
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  return `/admin?${query}`;
}
export const normalizeAdminSearch = (value: string) =>
  value.toLocaleLowerCase('ru').replace(/ё/g, 'е').trim();

export function adminSaveRedirect(tab: AdminTab, returnTo: string) {
  const params: Record<string, string> = { ok: '1' };
  try {
    const url = new URL(returnTo, 'https://admin.invalid');
    if (
      url.origin === 'https://admin.invalid' &&
      url.pathname === '/admin' &&
      url.searchParams.get('tab') === tab
    ) {
      for (const key of ['q', 'year', 'stage', 'date', 'category']) {
        const value = url.searchParams.get(key);
        if (value) params[key] = value.slice(0, 200);
      }
    }
  } catch {
    /* Missing or invalid return paths go to the section list. */
  }
  return adminHref(tab, params);
}
export function matchesAdminSearch(query: string, ...values: (string | undefined)[]) {
  const text = normalizeAdminSearch(values.filter(Boolean).join(' '));
  return normalizeAdminSearch(query)
    .split(/\s+/)
    .every((word) => text.includes(word));
}
export function buildAdminSearch(data: AppData): AdminSearchItem[] {
  return [
    ...adminSections.map((section) => ({
      title: section.label,
      detail: 'Раздел',
      href: adminHref(section.key),
      keywords: section.description,
    })),
    ...data.headliners.map((item) => ({
      title: item.name,
      detail: 'Артист',
      href: adminHref('headliners', { edit: item.id }),
      keywords: item.alternateNames?.join(' '),
    })),
    ...data.schedule.map((item) => ({
      title: item.artist,
      detail: `Выступление · ${item.date} · ${item.startTime}`,
      href: adminHref('schedule', { edit: item.id }),
    })),
    ...data.autographs.map((item) => ({
      title: item.artist,
      detail: `Автографы · ${item.date} · ${item.startTime}`,
      href: adminHref('autographs', { edit: item.id }),
    })),
    ...data.foodcourt.map((item) => ({
      title: item.name,
      detail: `Фудкорт · ${item.location}`,
      href: adminHref('foodcourt', { edit: item.id }),
    })),
  ];
}
