import { ImageSource } from 'expo-image';
import { API_BASE_URL, API_FALLBACK_URLS, resolveMediaUrl } from '../config/api';
import { toListImageUrl } from './imageSource';

export { toListImageUrl };

type ArtistImageChainOptions = {
  /** Prefer `*-list.webp` siblings for small UI (falls back to full on error). */
  preferList?: boolean;
};

/** CMS / API image URL only — no bundled artist fallbacks. */
export function buildArtistImageSourceChain(
  imageUrl?: string | null,
  _artist?: string | null,
  options?: ArtistImageChainOptions,
): (ImageSource | number)[] {
  const chain: (ImageSource | number)[] = [];
  const cmsUrl = resolveMediaUrl(imageUrl);
  if (!cmsUrl) {
    return chain;
  }

  if (options?.preferList) {
    const listUrl = toListImageUrl(cmsUrl);
    if (listUrl !== cmsUrl) {
      chain.push({ uri: listUrl });
    }
  }
  chain.push({ uri: cmsUrl });
  try {
    const source=new URL(cmsUrl);
    if(source.pathname.startsWith('/api/uploads/') && [new URL(API_BASE_URL).origin,'https://uletayapp.ru'].includes(source.origin)) {
      for(const base of API_FALLBACK_URLS)chain.push({uri:`${base.replace(/\/api$/,'')}${source.pathname}${source.search}`});
    }
  }catch{/* A non-URL source keeps its original fallback behavior. */}
  return chain;
}

export function resolveArtistImageSource(
  imageUrl?: string | null,
  artist?: string | null,
): ImageSource | number | undefined {
  return buildArtistImageSourceChain(imageUrl, artist)[0];
}

/** Bundled fest artist images removed; always undefined. */
export function getFestArtistImageSource(_artist?: string | null): ImageSource | number | undefined {
  return undefined;
}
