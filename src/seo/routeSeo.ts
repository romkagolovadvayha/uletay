import type { AppData } from '../types';
import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from './site';

export type SeoMeta = {
  title: string;
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

export type NavState = {
  routes: RouteNode[];
  index: number;
};

const STATIC_SEO: Record<string, Omit<SeoMeta, 'path'> & { path: string }> = {
  HomeTab: {
    title: `Официальное приложение фестиваля — ${SITE_NAME}`,
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
  },
  PlaylistTab: {
    title: `Фестивальное радио — ${SITE_NAME}`,
    description:
      'Слушайте радио фестиваля УЛЕТАЙ в прямом эфире и смотрите, что сейчас играет на площадке.',
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
  },
  HeadlinersMain: {
    title: `Хэдлайнеры — ${SITE_NAME}`,
    description:
      'Хэдлайнеры фестиваля УЛЕТАЙ: артисты прошлых лет и главные звёзды площадки в Лагуново.',
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
      return params.poiId ? `/map/${params.poiId}` : '/map';
    case 'ScheduleMain':
      return '/schedule';
    case 'LiveDetail':
      return params.performanceId ? `/schedule/live/${params.performanceId}` : '/schedule';
    case 'FullSchedule':
      return params.stageId ? `/schedule/full/${params.stageId}` : '/schedule/full';
    case 'AutographsMain':
      return '/autographs';
    case 'AutographDetail':
      return params.sessionId ? `/autographs/${params.sessionId}` : '/autographs';
    case 'FavoritesTab':
      return '/favorites';
    case 'PlaylistTab':
      return '/playlist';
    case 'MoreHome':
      return '/';
    case 'FoodCourtMain':
      return '/foodcourt';
    case 'FoodCourtDetail':
      return params.vendorId ? `/foodcourt/${params.vendorId}` : '/foodcourt';
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
      return params.headlinerId ? `/headliners/${params.headlinerId}` : '/headliners';
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
        ? `${artist} — ${formatSeoDate(performance.date)}, ${performance.startTime} | ${SITE_NAME}`
        : `${artist} — расписание | ${SITE_NAME}`,
      description: performance
        ? `${artist} на фестивале УЛЕТАЙ: ${formatSeoDate(performance.date)}, ${performance.startTime}–${performance.endTime}${stage ? `, ${stage}` : ''}.`
        : 'Страница выступления на фестивале УЛЕТАЙ: время, сцена и подробности концерта.',
      path: `/schedule/live/${params.performanceId}`,
      provisional: !performance,
    };
  }

  if (routeName === 'AutographDetail' && params.sessionId) {
    const session = data.autographs.find((item) => item.id === params.sessionId);
    const artist = session?.artist ?? 'Автограф-сессия';
    return {
      title: session
        ? `${artist} — автограф ${formatSeoDate(session.date)}, ${session.startTime} | ${SITE_NAME}`
        : `${artist} — автограф | ${SITE_NAME}`,
      description: session
        ? `Автограф-сессия ${artist}: ${formatSeoDate(session.date)}, ${session.startTime}–${session.endTime}${session.location ? `, ${session.location}` : ''}.`
        : 'Страница автограф-сессии на фестивале УЛЕТАЙ: время и место встречи с артистом.',
      path: `/autographs/${params.sessionId}`,
      provisional: !session,
    };
  }

  if (routeName === 'FoodCourtDetail' && params.vendorId) {
    const vendor = data.foodcourt.find((item) => item.id === params.vendorId);
    const name = vendor?.name ?? 'Вендор';
    return {
      title: `${name} — фудкорт | ${SITE_NAME}`,
      description: vendor
        ? `${name} на фудкорте фестиваля УЛЕТАЙ: меню, цены и описание точки питания.`
        : 'Страница точки питания на фудкорте фестиваля УЛЕТАЙ: меню, цены и расположение.',
      path: `/foodcourt/${params.vendorId}`,
      provisional: !vendor,
    };
  }

  if (routeName === 'MapTab' && params.poiId) {
    return {
      title: `Точка на карте — ${SITE_NAME}`,
      description: 'Подробности о выбранной точке на карте фестиваля УЛЕТАЙ.',
      path: `/map/${params.poiId}`,
    };
  }

  if (routeName === 'FullSchedule' && params.stageId) {
    const stage = data.stages.find((item) => item.id === params.stageId);
    const stageName = stage?.name ?? 'Сцена';
    return {
      title: `${stageName} — расписание | ${SITE_NAME}`,
      description: `Расписание выступлений на сцене «${stageName}» на фестивале УЛЕТАЙ.`,
      path: `/schedule/full/${params.stageId}`,
    };
  }

  if (routeName === 'HeadlinerDetail' && params.headlinerId) {
    const headliner = data.headliners.find((item) => item.id === params.headlinerId);
    const name = headliner?.name ?? 'Хэдлайнер';
    const lastfm = headliner?.lastfm;
    const yearsLabel = headliner?.years.length
      ? ` (${[...headliner.years].sort((a, b) => b - a).join(' ')})`
      : '';
    return {
      title: `${name} — хэдлайнер | ${SITE_NAME}`,
      description: headliner
        ? lastfm?.bioSummary?.trim() ||
          headliner.description.trim() ||
          `${name} — хэдлайнер фестиваля УЛЕТАЙ${yearsLabel}.`
        : 'Страница артиста — участника фестиваля УЛЕТАЙ: годы выступлений и популярные треки.',
      path: `/headliners/${params.headlinerId}`,
      provisional: !headliner,
    };
  }

  const staticMeta = STATIC_SEO[routeName];
  if (staticMeta) {
    return { ...staticMeta, path: path || staticMeta.path };
  }

  return {
    title: SITE_NAME,
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
