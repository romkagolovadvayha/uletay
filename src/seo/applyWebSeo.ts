import { Platform } from 'react-native';
import type { AppData } from '../types';
import type { SeoMeta } from './routeSeo';
import { getCanonicalUrl } from './routeSeo';
import { buildWebStructuredData } from './structuredData';
import {
  DEFAULT_KEYWORDS,
  DEFAULT_SOCIAL_IMAGE_URL,
} from './site';

function truncateDescription(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1).replace(/\s+\S*$/, '')}…`;
}

function upsertMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  if (typeof document === 'undefined') {
    return;
  }

  const selector = `meta[${attribute}="${name}"]`;
  const matches = document.head.querySelectorAll(selector);

  if (matches.length === 0) {
    const element = document.createElement('meta');
    element.setAttribute(attribute, name);
    element.setAttribute('content', content);
    document.head.appendChild(element);
    return;
  }

  matches.forEach((element, index) => {
    element.setAttribute('content', content);
    if (index > 0) {
      element.remove();
    }
  });
}

function upsertLink(rel: string, href: string) {
  if (typeof document === 'undefined') {
    return;
  }

  const matches = document.head.querySelectorAll(`link[rel="${rel}"]`);

  if (matches.length === 0) {
    const element = document.createElement('link');
    element.rel = rel;
    element.href = href;
    document.head.appendChild(element);
    return;
  }

  matches.forEach((element, index) => {
    (element as HTMLLinkElement).href = href;
    if (index > 0) {
      element.remove();
    }
  });
}

function upsertJsonLd(meta: SeoMeta, data: AppData) {
  const value = JSON.stringify(buildWebStructuredData(meta, data));
  const matches = document.head.querySelectorAll<HTMLScriptElement>(
    'script#seo-jsonld[type="application/ld+json"]',
  );
  const element = matches[0] ?? document.createElement('script');
  element.id = 'seo-jsonld';
  element.type = 'application/ld+json';
  element.textContent = value;
  if (!element.isConnected) {
    document.head.appendChild(element);
  }
  matches.forEach((duplicate, index) => {
    if (index > 0) {
      duplicate.remove();
    }
  });
}

export function applyWebSeo(meta: SeoMeta, data: AppData) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  const canonical = getCanonicalUrl(meta.path);
  const robots = meta.noIndex ? 'noindex, nofollow' : 'index, follow';
  const description = truncateDescription(meta.description, 160);
  const socialDescription = truncateDescription(meta.description, 200);

  document.title = meta.title;
  upsertMeta('description', description);
  upsertMeta('keywords', DEFAULT_KEYWORDS);
  upsertMeta('robots', robots);
  upsertLink('canonical', canonical);

  upsertMeta('og:title', meta.title, 'property');
  upsertMeta('og:description', socialDescription, 'property');
  upsertMeta('og:url', canonical, 'property');
  upsertMeta('og:site_name', meta.siteName, 'property');
  upsertMeta('og:type', 'website', 'property');
  upsertMeta('og:locale', 'ru_RU', 'property');
  upsertMeta('og:image', DEFAULT_SOCIAL_IMAGE_URL, 'property');
  upsertMeta('og:image:width', '1024', 'property');
  upsertMeta('og:image:height', '576', 'property');
  upsertMeta('og:image:alt', `${meta.siteName} — фестиваль в Удмуртии`, 'property');

  upsertMeta('twitter:card', 'summary_large_image');
  upsertMeta('twitter:title', meta.title);
  upsertMeta('twitter:description', socialDescription);
  upsertMeta('twitter:image', DEFAULT_SOCIAL_IMAGE_URL);
  upsertJsonLd(meta, data);
}
