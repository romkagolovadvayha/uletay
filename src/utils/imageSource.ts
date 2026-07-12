import { ImageSource } from 'expo-image';
import { resolveMediaUrl } from '../config/api';

export const BUNDLED_FESTIVAL_LOGO = require('../../assets/images/festival-logo.png');
export const FESTIVAL_LOGO_FEST_ASSET = '/api/fest-assets/images/festival-logo.png';

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
