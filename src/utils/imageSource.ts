import { ImageSource } from 'expo-image';
import { resolveMediaUrl } from '../config/api';

export const BUNDLED_FESTIVAL_LOGO = require('../../assets/images/festival-logo.png');
export const FESTIVAL_LOGO_FEST_ASSET = '/api/fest-assets/images/festival-logo.png';

/** CMS/full WebP → sibling list thumb: `foo.webp` → `foo-list.webp`. */
export function toListImageUrl(url: string): string {
  if (/-list\.webp(\?|#|$)/i.test(url)) {
    return url;
  }
  return url.replace(/(\.webp)(\?[^#]*)?(#.*)?$/i, '-list$1$2$3');
}

/** CMS logo → display sibling: `foo.webp` → `foo-sm.webp`. */
export function toLogoSmUrl(url: string): string {
  if (/-sm\.webp(\?|#|$)/i.test(url)) {
    return url;
  }
  return url.replace(/(\.webp)(\?[^#]*)?(#.*)?$/i, '-sm$1$2$3');
}

export function getRemoteImageSource(
  url?: string | null,
  fallback?: number,
): ImageSource | number {
  const resolved = resolveMediaUrl(url);
  if (resolved) {
    return { uri: resolved };
  }
  if (fallback) {
    return fallback;
  }
  throw new Error('getRemoteImageSource: no image URL or fallback provided');
}

/** Prefer `*-list.webp` for small UI; caller should fall back to full URL on error. */
export function getRemoteListImageSource(url?: string | null): ImageSource | undefined {
  const resolved = resolveMediaUrl(url);
  if (!resolved) {
    return undefined;
  }
  return { uri: toListImageUrl(resolved) };
}

/** CMS upload → fest-assets on server → bundled asset in the app. */
export function resolveFestivalLogoSource(logoImageUrl?: string | null): ImageSource | number {
  const cmsUrl = resolveMediaUrl(logoImageUrl?.trim());
  if (cmsUrl) {
    return { uri: cmsUrl };
  }

  const festUrl = resolveMediaUrl(FESTIVAL_LOGO_FEST_ASSET);
  if (festUrl) {
    return { uri: festUrl };
  }

  return BUNDLED_FESTIVAL_LOGO;
}

/** Prefer `*-sm.webp` for the home hero logo; fall back to full URL. */
export function resolveFestivalLogoSourceChain(
  logoImageUrl?: string | null,
): (ImageSource | number)[] {
  const chain: (ImageSource | number)[] = [];
  const cmsUrl = resolveMediaUrl(logoImageUrl?.trim());
  if (cmsUrl) {
    const sm = toLogoSmUrl(cmsUrl);
    if (sm !== cmsUrl) {
      chain.push({ uri: sm });
    }
    chain.push({ uri: cmsUrl });
  }

  const festUrl = resolveMediaUrl(FESTIVAL_LOGO_FEST_ASSET);
  if (festUrl && !chain.some((item) => typeof item === 'object' && item && 'uri' in item && item.uri === festUrl)) {
    chain.push({ uri: festUrl });
  }

  chain.push(BUNDLED_FESTIVAL_LOGO);
  return chain;
}
