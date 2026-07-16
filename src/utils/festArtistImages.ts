import { ImageSource } from 'expo-image';
import { resolveMediaUrl } from '../config/api';
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
