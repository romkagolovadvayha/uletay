import { Platform } from 'react-native';
import type { SeoMeta } from './routeSeo';
import { getCanonicalUrl } from './routeSeo';
import { DEFAULT_KEYWORDS, SITE_NAME } from './site';

function upsertMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  if (typeof document === 'undefined') {
    return;
  }

  const selector = `meta[${attribute}="${name}"]`;
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  if (typeof document === 'undefined') {
    return;
  }

  let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;

  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    document.head.appendChild(element);
  }

  element.href = href;
}

export function applyWebSeo(meta: SeoMeta) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  const canonical = getCanonicalUrl(meta.path);
  const robots = meta.noIndex ? 'noindex, nofollow' : 'index, follow';

  document.title = meta.title;
  upsertMeta('description', meta.description);
  upsertMeta('keywords', DEFAULT_KEYWORDS);
  upsertMeta('robots', robots);
  upsertLink('canonical', canonical);

  upsertMeta('og:title', meta.title, 'property');
  upsertMeta('og:description', meta.description, 'property');
  upsertMeta('og:url', canonical, 'property');
  upsertMeta('og:site_name', SITE_NAME, 'property');
  upsertMeta('og:type', 'website', 'property');
  upsertMeta('og:locale', 'ru_RU', 'property');

  upsertMeta('twitter:card', 'summary');
  upsertMeta('twitter:title', meta.title);
  upsertMeta('twitter:description', meta.description);
}
