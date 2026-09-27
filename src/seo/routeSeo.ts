import type { AppData } from '../types';
import { encodeSeoRouteId, isDateWithinFestival } from './seoRouteUtils';
import { DEFAULT_DESCRIPTION, getSiteName, SITE_NAME, SITE_URL } from './site';

export type SeoMeta = {
  title: string;
  siteName: string;
  description: string;
  path: string;
  noIndex?: boolean;
  /** The route is valid, but its entity has not arrived from the API yet. */
  provisional?: boolean;
};

type RouteNode = {
  name: string;
  params?: Record<string, unknown>;
  state?: NavState;
};

const HEADLINER_DESCRIPTION_MAX_LENGTH = 160;

function formatHeadlinerYearsForDescription(years: number[]): string {
  const sortedYears = [...years].sort((a, b) => b - a);
  if (sortedYears.length <= 1) {
    return sortedYears.join('');
  }

  return `${sortedYears.slice(0, -1).join(', ')} и ${sortedYears.at(-1)}`;
}

function buildHeadlinerDescription(
  headliner: AppData['headliners'][number],
): string {
  const sortedYears = [...headliner.years].sort((a, b) => b - a);
  const fullYears = formatHeadlinerYearsForDescription(sortedYears);
  const recentYears =
    sortedYears.length > 4
      ? `${sortedYears.slice(0, 4).join(', ')} и другие годы`
      : fullYears;
  const details = [
    'На странице собраны популярные треки, статистика прослушиваний, жанры и похожие артисты.',
    'Популярные треки, статистика прослушиваний и похожие артисты.',
    'Популярные треки, статистика и похожие артисты.',
  ];

  const introductions = sortedYears.length > 1
    ? [
        `${headliner.name} — хэдлайнер фестиваля УЛЕТАЙ. Годы выступлений: ${fullYears}.`,
        `${headliner.name} — хэдлайнер фестиваля УЛЕТАЙ. Годы выступлений: ${recentYears}.`,
      ]
    : sortedYears.length === 1
      ? [`${headliner.name} — участник фестиваля УЛЕТАЙ ${sortedYears[0]} года.`]
      : [`${headliner.name} — артист фестиваля УЛЕТАЙ.`];

  for (const introduction of introductions) {
    for (const detail of details) {
      const description = `${introduction} ${detail}`;
      if (description.length <= HEADLINER_DESCRIPTION_MAX_LENGTH) {
        return description;
      }
    }
  }

  return introductions.at(-1) ?? `${headliner.name} — артист фестиваля УЛЕТАЙ.`;
}

export type NavState = {
  routes: RouteNode[];
  index: number;
};

const STATIC_SEO: Record<string, Omit<SeoMeta, 'path' | 'siteName'> & { path: string }> = {
  HomeTab: {
    title: `Приложение фестиваля — ${SITE_NAME}`,
    description: DEFAULT_DESCRIPTION,
    path: '/',
  },
  MapTab: {
    title: `Карта фестиваля — ${SITE_NAME}`,
    description:
      'Интерактивная карта фестиваля УЛЕТАЙ: сцены, фудкорт, сервисные зоны и маршруты по площадке в Лагуново.',
    path: '/map',
  },
  ScheduleMain: {
    title: `Расписание концертов — ${SITE_NAME}`,
    description:
      'Актуальное расписание выступлений на всех сценах фестиваля УЛЕТАЙ: кто и когда играет сегодня.',
    path: '/schedule',
  },
  FullSchedule: {
    title: `Полное расписание — ${SITE_NAME}`,
    description:
      'Полная сетка расписания фестиваля УЛЕТАЙ по сценам и дням — удобный обзор всех концертов.',
    path: '/schedule/full',
    noIndex: true,
  },
  AutographsMain: {
    title: `Автограф-сессии — ${SITE_NAME}`,
    description:
      'Расписание автограф-сессий артистов фестиваля УЛЕТАЙ: время, место и участники встреч с фанатами.',
    path: '/autographs',
  },
  FavoritesTab: {
    title: `Избранное — ${SITE_NAME}`,
    description:
      'Ваше избранное на фестивале УЛЕТАЙ: сохранённые выступления и напоминания о любимых артистах.',
    path: '/favorites',
    noIndex: true,
  },
  PlaylistTab: {
    title: 'Улетай радио — слушать рок онлайн бесплатно',
    description:
      'Улетай радио: Рок станция в прямом эфире. Слушайте онлайн бесплатно, узнавайте исполнителей и названия песен, смотрите обложки и очередь треков.',
    path: '/playlist',
  },
  FoodCourtMain: {
    title: `Фудкорт — ${SITE_NAME}`,
    description:
      'Все точки питания на фестивале УЛЕТАЙ: вендоры, меню, цены и расположение на карте площадки.',
    path: '/foodcourt',
  },
  FestivalAbout: {
    title: `О фестивале — ${SITE_NAME}`,
    description:
      'Информация о фестивале УЛЕТАЙ: даты, локация в Лагуново, возрастное ограничение и полезные детали.',
    path: '/about',
  },
  FestivalRules: {
    title: `Правила фестиваля — ${SITE_NAME}`,
    description:
      'Правила посещения фестиваля УЛЕТАЙ: безопасность, поведение на площадке и важные требования для гостей.',
    path: '/rules',
  },
  Legal: {
    title: `Политика конфиденциальности — ${SITE_NAME}`,
    description:
      'Политика конфиденциальности, пользовательское соглашение и контакты организатора фестиваля УЛЕТАЙ.',
    path: '/legal',
  },
  Settings: {
    title: `Настройки — ${SITE_NAME}`,
    description: 'Настройки приложения фестиваля УЛЕТАЙ: режим времени, уведомления и правовая информация.',
    path: '/settings',
    noIndex: true,
  },
  HelpTab: {
    title: `Помощь — ${SITE_NAME}`,
    description:
      'Помощь по приложению фестиваля УЛЕТАЙ: расписание, карта, уведомления и ответы на частые вопросы.',
    path: '/help',
  },
  HeadlinersMain: {
    title: `Хэдлайнеры — ${SITE_NAME}`,
    description:
      'Хэдлайнеры фестиваля УЛЕТАЙ по годам: состав участников, артисты прошлых фестивалей, поиск и сортировка по популярности, история выступлений музыкантов.',
    path: '/headliners',
  },
};

function getDeepestRoute(state: NavState | undefined): RouteNode | null {
  if (!state) {
    return null;
  }

  const route = state.routes[state.index ?? 0];
  if (!route) {
    return null;
  }

  if (route.state) {
    return getDeepestRoute(route.state) ?? route;
  }

  return route;
}

function buildPath(chain: RouteNode[]): string {
  const active = chain[chain.length - 1];
  const params = (active?.params ?? {}) as Record<string, string | undefined>;

  switch (active?.name) {
    case 'HomeTab':
      return '/';
    case 'MapTab':
      return params.poiId ? `/map/${encodeSeoRouteId(params.poiId)}` : '/map';
    case 'ScheduleMain':
      return '/schedule';
    case 'LiveDetail':
      return params.performanceId
        ? `/schedule/live/${encodeSeoRouteId(params.performanceId)}`
        : '/schedule';
    case 'FullSchedule':
      return params.stageId
        ? `/schedule/full/${encodeSeoRouteId(params.stageId)}`
        : '/schedule/full';
    case 'AutographsMain':
      return '/autographs';
    case 'AutographDetail':
      return params.sessionId
        ? `/autographs/${encodeSeoRouteId(params.sessionId)}`
        : '/autographs';
    case 'FavoritesTab':
      return '/favorites';
    case 'PlaylistTab':
      return '/playlist';
    case 'MoreHome':
      return '/';
    case 'FoodCourtMain':
      return '/foodcourt';
    case 'FoodCourtDetail':
      return params.vendorId
        ? `/foodcourt/${encodeSeoRouteId(params.vendorId)}`
        : '/foodcourt';
    case 'FestivalAbout':
      return '/about';
    case 'FestivalRules':
      return '/rules';
    case 'Legal':
      return '/legal';
    case 'Settings':
      return '/settings';
    case 'HeadlinersMain':
      return '/headliners';
    case 'HeadlinerDetail':
      return params.headlinerId
        ? `/headliners/${encodeSeoRouteId(params.headlinerId)}`
        : '/headliners';
    default:
      return '/';
  }
}

function collectRoutes(state: NavState | undefined, acc: RouteNode[] = []): RouteNode[] {
  if (!state) {
    return acc;
  }

  const route = state.routes[state.index ?? 0];
  if (!route) {
    return acc;
  }

  acc.push(route);
  if (route.state) {
    collectRoutes(route.state, acc);
  }

  return acc;
}

function formatSeoDate(date: string): string {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return date;
  }

  const [, year, month, day] = match;
  const months = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ];
  return `${Number(day)} ${months[Number(month) - 1] ?? month} ${year}`;
}

export function resolveSeoMeta(
  navigationState: NavState | undefined,
  data: AppData,
): SeoMeta {
  const siteName = getSiteName(data.festival.year);
  const chain = collectRoutes(navigationState);
  const active = getDeepestRoute(navigationState ?? undefined);
  const routeName = active?.name ?? 'HomeTab';
  const params = (active?.params ?? {}) as Record<string, string | undefined>;
  const path = chain.length ? buildPath(chain) : '/';

  if (routeName === 'LiveDetail' && params.performanceId) {
    const performance = data.schedule.find((item) => item.id === params.performanceId);
    const artist = performance?.artist ?? 'Выступление';
    const stage = performance
      ? data.stages.find((item) => item.id === performance.stageId)?.name
      : undefined;
    return {
      title: performance
        ? `${artist} — ${formatSeoDate(performance.date)}, ${performance.startTime} | ${siteName}`
        : `${artist} — расписание | ${siteName}`,
      siteName,
      description: performance
        ? `${artist} на фестивале УЛЕТАЙ: ${formatSeoDate(performance.date)}, ${performance.startTime}–${performance.endTime}${stage ? `, ${stage}` : ''}.`
        : 'Страница выступления на фестивале УЛЕТАЙ: время, сцена и подробности концерта.',
      path: `/schedule/live/${encodeSeoRouteId(params.performanceId)}`,
      noIndex: !performance || !isDateWithinFestival(performance.date, data.festival),
      provisional: !performance,
    };
  }

  if (routeName === 'AutographDetail' && params.sessionId) {
    const session = data.autographs.find((item) => item.id === params.sessionId);
    const artist = session?.artist ?? 'Автограф-сессия';
    return {
      title: session
        ? `${artist} — автограф ${formatSeoDate(session.date)}, ${session.startTime} | ${siteName}`
        : `${artist} — автограф | ${siteName}`,
      siteName,
      description: session
        ? `Автограф-сессия ${artist}: ${formatSeoDate(session.date)}, ${session.startTime}–${session.endTime}${session.location ? `, ${session.location}` : ''}.`
        : 'Страница автограф-сессии на фестивале УЛЕТАЙ: время и место встречи с артистом.',
      path: `/autographs/${encodeSeoRouteId(params.sessionId)}`,
      noIndex: !session || !isDateWithinFestival(session.date, data.festival),
      provisional: !session,
    };
  }

  if (routeName === 'FoodCourtDetail' && params.vendorId) {
    const vendor = data.foodcourt.find((item) => item.id === params.vendorId);
    const name = vendor?.name ?? 'Вендор';
    return {
      title: `${name} — фудкорт | ${siteName}`,
      siteName,
      description: vendor
        ? `${name} на фудкорте фестиваля УЛЕТАЙ: меню, цены и описание точки питания.`
        : 'Страница точки питания на фудкорте фестиваля УЛЕТАЙ: меню, цены и расположение.',
      path: `/foodcourt/${encodeSeoRouteId(params.vendorId)}`,
      noIndex: !vendor,
      provisional: !vendor,
    };
  }

  if (routeName === 'MapTab' && params.poiId) {
    return {
      title: `Точка на карте — ${siteName}`,
      siteName,
      description: 'Подробности о выбранной точке на карте фестиваля УЛЕТАЙ.',
      path: `/map/${encodeSeoRouteId(params.poiId)}`,
      noIndex: true,
    };
  }

  if (routeName === 'FullSchedule' && params.stageId) {
    const stage = data.stages.find((item) => item.id === params.stageId);
    const stageName = stage?.name ?? 'Сцена';
    return {
      title: `${stageName} — расписание | ${siteName}`,
      siteName,
      description: `Расписание выступлений на сцене «${stageName}» на фестивале УЛЕТАЙ.`,
      path: `/schedule/full/${encodeSeoRouteId(params.stageId)}`,
      noIndex: true,
    };
  }

  if (routeName === 'HeadlinerDetail' && params.headlinerId) {
    const headliner = data.headliners.find((item) => item.id === params.headlinerId);
    const name = headliner?.name ?? 'Хэдлайнер';
    return {
      title: `${name} — хэдлайнер | ${siteName}`,
      siteName,
      description: headliner
        ? buildHeadlinerDescription(headliner)
        : 'Страница артиста — участника фестиваля УЛЕТАЙ: годы выступлений и популярные треки.',
      path: `/headliners/${encodeSeoRouteId(params.headlinerId)}`,
      noIndex: !headliner,
      provisional: !headliner,
    };
  }

  const staticMeta = STATIC_SEO[routeName];
  if (staticMeta) {
    return {
      ...staticMeta,
      title: staticMeta.title.replace(SITE_NAME, siteName),
      siteName,
      path: path || staticMeta.path,
    };
  }

  return {
    title: siteName,
    siteName,
    description: DEFAULT_DESCRIPTION,
    path: '/',
  };
}

export function getCanonicalUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const encodedPath = normalized
    .split('/')
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join('/');
  return new URL(encodedPath, `${SITE_URL.replace(/\/$/, '')}/`).href;
}
