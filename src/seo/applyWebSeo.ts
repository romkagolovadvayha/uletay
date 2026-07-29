import { Platform } from 'react-native';
import type { SeoMeta } from './routeSeo';
import { getCanonicalUrl } from './routeSeo';
import {
  DEFAULT_KEYWORDS,
  DEFAULT_SOCIAL_IMAGE_URL,
} from './site';

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
  upsertMeta('og:site_name', meta.siteName, 'property');
  upsertMeta('og:type', 'website', 'property');
  upsertMeta('og:locale', 'ru_RU', 'property');
  upsertMeta('og:image', DEFAULT_SOCIAL_IMAGE_URL, 'property');
  upsertMeta('og:image:width', '1024', 'property');
  upsertMeta('og:image:height', '576', 'property');
  upsertMeta('og:image:alt', `${meta.siteName} — фестиваль в Удмуртии`, 'property');

  upsertMeta('twitter:card', 'summary_large_image');
  upsertMeta('twitter:title', meta.title);
  upsertMeta('twitter:description', meta.description);
  upsertMeta('twitter:image', DEFAULT_SOCIAL_IMAGE_URL);
}
