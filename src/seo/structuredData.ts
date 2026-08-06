import type { AppData, FestivalInfo } from '../types';
import { FESTIVAL_WEBSITE, LEGAL_OPERATOR } from '../constants/legal';
import { getCanonicalUrl, type SeoMeta } from './routeSeo';
import { DEFAULT_SOCIAL_IMAGE_URL, SITE_URL } from './site';
import {
  decodeSeoRouteParam,
  festivalDateTime,
  festivalEndDateTime,
  isDateWithinFestival,
} from './seoRouteUtils';

type JsonLdNode = Record<string, unknown>;

const siteRoot = `${SITE_URL.replace(/\/$/, '')}/`;
const organizationId = `${siteRoot}#organization`;
const websiteId = `${siteRoot}#website`;
const festivalId = `${siteRoot}#festival`;
const knownBrokenImageEntityIds = new Set(['hl-отава-ё']);

function absoluteUrl(value: string | null | undefined): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  try {
    return new URL(value, siteRoot).href;
  } catch {
    return undefined;
  }
}

function entityImage(entityId: string, value: string | null | undefined): string {
  return knownBrokenImageEntityIds.has(entityId)
    ? DEFAULT_SOCIAL_IMAGE_URL
    : absoluteUrl(value) ?? DEFAULT_SOCIAL_IMAGE_URL;
}

function postalAddress(festival: FestivalInfo): JsonLdNode {
  return {
    '@type': 'PostalAddress',
    addressLocality: festival.locationShort || festival.location,
    addressRegion: 'Удмуртская Республика',
    addressCountry: 'RU',
  };
}

function routeEntityId(path: string, prefix: string): string | null {
  if (!path.startsWith(prefix)) {
    return null;
  }
  const segment = path.slice(prefix.length);
  return segment && !segment.includes('/') ? decodeSeoRouteParam(segment) : null;
}

function breadcrumbItems(meta: SeoMeta, canonical: string): JsonLdNode[] {
  const items: JsonLdNode[] = [
    { '@type': 'ListItem', position: 1, name: 'Главная', item: siteRoot },
  ];

  if (meta.path === '/') {
    return items;
  }

  const section = meta.path.startsWith('/schedule/')
    ? { name: 'Расписание', path: '/schedule' }
    : meta.path.startsWith('/autographs/')
      ? { name: 'Автограф-сессии', path: '/autographs' }
      : meta.path.startsWith('/foodcourt/')
        ? { name: 'Фудкорт', path: '/foodcourt' }
        : meta.path.startsWith('/headliners/')
          ? { name: 'Хэдлайнеры', path: '/headliners' }
          : null;

  if (section && meta.path !== section.path) {
    items.push({
      '@type': 'ListItem',
      position: items.length + 1,
      name: section.name,
      item: new URL(section.path, siteRoot).href,
    });
  }

  items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name: meta.title,
    item: canonical,
  });
  return items;
}

function festivalNode(data: AppData): JsonLdNode {
  const image = absoluteUrl(data.festival.heroImageUrl) ?? DEFAULT_SOCIAL_IMAGE_URL;
  return {
    '@type': 'Festival',
    '@id': festivalId,
    name: `${data.festival.name} ${data.festival.year}`,
    description: `Фестиваль настоящей музыки ${data.festival.name} в ${data.festival.locationShort}.`,
    startDate: data.festival.startDate,
    endDate: data.festival.endDate,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: data.festival.locationShort || data.festival.location,
      address: postalAddress(data.festival),
    },
    image,
    organizer: { '@id': organizationId },
    url: siteRoot,
  };
}

function pageEntity(meta: SeoMeta, data: AppData, canonical: string): JsonLdNode | null {
  const performanceId = routeEntityId(meta.path, '/schedule/live/');
  if (performanceId) {
    const performance = data.schedule.find((item) => item.id === performanceId);
    if (!performance || !isDateWithinFestival(performance.date, data.festival)) {
      return null;
    }
    const headliner = data.headliners.find((item) => item.id === performance.headlinerId);
    const stage = data.stages.find((item) => item.id === performance.stageId);
    return {
      '@type': 'MusicEvent',
      '@id': `${canonical}#event`,
      name: `${performance.artist} на фестивале ${data.festival.name}`,
      description: meta.description,
      startDate: festivalDateTime(performance.date, performance.startTime),
      endDate: festivalEndDateTime(performance.date, performance.startTime, performance.endTime),
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      image: entityImage(
        headliner?.id ?? performance.id,
        performance.imageUrl ?? headliner?.imageUrl,
      ),
      location: {
        '@type': 'Place',
        name: stage?.name ?? 'Сцена фестиваля',
        address: postalAddress(data.festival),
      },
      organizer: { '@id': organizationId },
      performer: { '@type': 'MusicGroup', name: performance.artist },
      superEvent: { '@id': festivalId },
      url: canonical,
    };
  }

  const autographId = routeEntityId(meta.path, '/autographs/');
  if (autographId) {
    const session = data.autographs.find((item) => item.id === autographId);
    if (!session || !isDateWithinFestival(session.date, data.festival)) {
      return null;
    }
    const headliner = data.headliners.find((item) => item.id === session.headlinerId);
    return {
      '@type': 'Event',
      '@id': `${canonical}#event`,
      name: `Автограф-сессия: ${session.artist}`,
      description: meta.description,
      startDate: festivalDateTime(session.date, session.startTime),
      endDate: festivalEndDateTime(session.date, session.startTime, session.endTime),
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      image: entityImage(
        headliner?.id ?? session.id,
        session.imageUrl ?? headliner?.imageUrl,
      ),
      location: {
        '@type': 'Place',
        name: session.location || 'Зона автограф-сессий',
        address: postalAddress(data.festival),
      },
      organizer: { '@id': organizationId },
      performer: { '@type': 'MusicGroup', name: session.artist },
      superEvent: { '@id': festivalId },
      url: canonical,
    };
  }

  const vendorId = routeEntityId(meta.path, '/foodcourt/');
  if (vendorId) {
    const vendor = data.foodcourt.find((item) => item.id === vendorId);
    return vendor
      ? {
          '@type': 'FoodEstablishment',
          '@id': `${canonical}#food-establishment`,
          name: vendor.name,
          description: vendor.description,
          address: postalAddress(data.festival),
          openingHours: vendor.hours,
          priceRange: vendor.priceRange || vendor.priceFrom,
          image: absoluteUrl(vendor.imageUrl) ?? DEFAULT_SOCIAL_IMAGE_URL,
          url: canonical,
        }
      : null;
  }

  const headlinerId = routeEntityId(meta.path, '/headliners/');
  if (headlinerId) {
    const headliner = data.headliners.find((item) => item.id === headlinerId);
    return headliner
      ? {
          '@type': 'MusicGroup',
          '@id': `${canonical}#artist`,
          name: headliner.name,
          description: meta.description,
          image: entityImage(headliner.id, headliner.imageUrl),
          url: canonical,
        }
      : null;
  }

  return meta.path === '/' ? { '@id': festivalId } : null;
}

export function buildWebStructuredData(meta: SeoMeta, data: AppData): JsonLdNode {
  const canonical = getCanonicalUrl(meta.path);
  const breadcrumbId = `${canonical}#breadcrumb`;
  const mainEntity = pageEntity(meta, data, canonical);
  const logo = absoluteUrl(data.festival.logoImageUrl) ?? DEFAULT_SOCIAL_IMAGE_URL;

  const graph: JsonLdNode[] = [
    {
      '@type': 'Organization',
      '@id': organizationId,
      name: `Фестиваль ${data.festival.name}`,
      legalName: LEGAL_OPERATOR.name,
      url: FESTIVAL_WEBSITE,
      logo: { '@type': 'ImageObject', url: logo },
      email: LEGAL_OPERATOR.email,
      telephone: LEGAL_OPERATOR.phones[0],
      address: {
        '@type': 'PostalAddress',
        streetAddress: LEGAL_OPERATOR.address,
        addressCountry: 'RU',
      },
      identifier: [
        {
          '@type': 'PropertyValue',
          propertyID: 'ОГРНИП',
          value: LEGAL_OPERATOR.ogrnip,
        },
        {
          '@type': 'PropertyValue',
          propertyID: 'ИНН',
          value: LEGAL_OPERATOR.inn,
        },
      ],
      contactPoint: LEGAL_OPERATOR.phones.map((telephone) => ({
        '@type': 'ContactPoint',
        contactType: 'customer support',
        telephone,
        email: LEGAL_OPERATOR.email,
        availableLanguage: 'Russian',
      })),
      sameAs: [FESTIVAL_WEBSITE],
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: siteRoot,
      name: meta.siteName,
      inLanguage: 'ru-RU',
      publisher: { '@id': organizationId },
    },
    {
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: meta.title,
      description: meta.description,
      inLanguage: 'ru-RU',
      isPartOf: { '@id': websiteId },
      about: { '@id': festivalId },
      breadcrumb: { '@id': breadcrumbId },
      ...(mainEntity ? { mainEntity: { '@id': String(mainEntity['@id']) } } : null),
    },
    {
      '@type': 'BreadcrumbList',
      '@id': breadcrumbId,
      itemListElement: breadcrumbItems(meta, canonical),
    },
    festivalNode(data),
  ];

  if (mainEntity && Object.keys(mainEntity).length > 1) {
    graph.push(mainEntity);
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}
