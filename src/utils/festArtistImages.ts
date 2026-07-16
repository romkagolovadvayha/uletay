import { ImageSource } from 'expo-image';
import { resolveMediaUrl } from '../config/api';
import { festArtistAssets } from '../data/festArtistAssets.generated';
import festSources from '../../scripts/fest-artist-sources.json';
import { toListImageUrl } from './imageSource';

export { toListImageUrl };

const festArtistUrls = festSources.artists as Record<string, string>;

const artistAliases: Record<string, string> = {
  ГОРШЕНЕВ: 'ГОРШЕНЕВА',
  RAVANNA: 'РАВАННА / RAVANNA',
  SELLOUT: 'СЕЛЛАУТ / SELLOUT',
  'КОСТЯ КУЛЯСОВ': 'КОСТЯ КУЛЯСОВ. АНИМАЦИЯ',
  POLNALYUBVI: 'ПОЛНАЛЮБВИ / POLNALYUBVI',
  'ВИА ВОЛГА-ВОЛГА': 'ВИА «ВОЛГА-ВОЛГА»',
  'ВОЛГА-ВОЛГА': 'ВИА «ВОЛГА-ВОЛГА»',
  'VERE DICTUM': 'ВЕРЕ ДИКТУМ / VERE DICTUM',
  HELVEGEN: 'ХЕЛЬВЕГЕН / HELVEGEN',
  LASCALA: 'ЛАСКАЛА / LASCALA',
  БАГИРА: 'БАГИРА / BAGIRA',
  KDRR: 'КДРР / KDRR',
  STIGMATA: 'СТИГМАТА / STIGMATA',
  'БЕZ Б': 'БЕЗ Б / BEZ B',
  DISTEMPER: 'ДИСТЕМПЕР / DISTEMPER',
  'ВКЛЮЧАЙ МИКРОФОН': 'ВКЛЮЧАЙ МИКРОФОН!',
};

function normalize(name: string): string {
  return name
    .toUpperCase()
    .replace(/Ё/g, 'Е')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveArtistKey(artist: string): string | undefined {
  const candidates = [artist, artistAliases[artist]].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (festArtistAssets[candidate] || festArtistUrls[candidate]) return candidate;

    const n = normalize(candidate);
    for (const key of Object.keys({ ...festArtistAssets, ...festArtistUrls })) {
      if (normalize(key) === n) return key;
    }

    const primary = normalize(candidate.split('/')[0]);
    for (const key of Object.keys({ ...festArtistAssets, ...festArtistUrls })) {
      const k = normalize(key.split('/')[0]);
      if (k === primary) return key;
    }
  }

  return undefined;
}

export function getFestArtistImageSource(artist?: string | null): ImageSource | number | undefined {
  if (!artist) return undefined;
  const key = resolveArtistKey(artist);
  if (!key) return undefined;

  const asset = festArtistAssets[key];
  if (asset) return asset;

  const url = festArtistUrls[key];
  const resolved = resolveMediaUrl(url);
  return resolved ? { uri: resolved } : undefined;
}

/** CMS upload first, then bundled fest artist assets. */
export function resolveArtistImageSource(
  imageUrl?: string | null,
  artist?: string | null,
): ImageSource | number | undefined {
  return buildArtistImageSourceChain(imageUrl, artist)[0];
}

function sameImageSource(a: ImageSource | number, b: ImageSource | number): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a === b;
  }
  if (
    typeof a === 'object' &&
    typeof b === 'object' &&
    a &&
    b &&
    'uri' in a &&
    'uri' in b &&
    typeof a.uri === 'string' &&
    typeof b.uri === 'string'
  ) {
    return a.uri === b.uri;
  }
  return false;
}

type ArtistImageChainOptions = {
  /** Prefer `*-list.webp` siblings for small UI (falls back to full on error). */
  preferList?: boolean;
};

/** CMS URL (if any), then fest bundled asset / fest-assets URL — same order as schedule cards. */
export function buildArtistImageSourceChain(
  imageUrl?: string | null,
  artist?: string | null,
  options?: ArtistImageChainOptions,
): (ImageSource | number)[] {
  const chain: (ImageSource | number)[] = [];
  const cmsUrl = resolveMediaUrl(imageUrl);
  if (cmsUrl) {
    if (options?.preferList) {
      const listUrl = toListImageUrl(cmsUrl);
      if (listUrl !== cmsUrl) {
        chain.push({ uri: listUrl });
      }
    }
    chain.push({ uri: cmsUrl });
  }

  const fest = getFestArtistImageSource(artist);
  if (fest) {
    if (
      options?.preferList &&
      typeof fest === 'object' &&
      fest &&
      'uri' in fest &&
      typeof fest.uri === 'string'
    ) {
      const listFest = { uri: toListImageUrl(fest.uri) };
      if (
        listFest.uri !== fest.uri &&
        !chain.some((item) => sameImageSource(item, listFest))
      ) {
        chain.push(listFest);
      }
    }
    if (!chain.some((item) => sameImageSource(item, fest))) {
      chain.push(fest);
    }
  }

  return chain;
}
