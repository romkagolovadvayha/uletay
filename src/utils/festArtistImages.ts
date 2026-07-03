import { ImageSource } from 'expo-image';
import { resolveMediaUrl } from '../config/api';
import { festArtistAssets } from '../data/festArtistAssets.generated';
import festSources from '../../scripts/fest-artist-sources.json';

const festArtistUrls = festSources.artists as Record<string, string>;

const artistAliases: Record<string, string> = {
  ГОРШЕНЕВ: 'ГОРШЕНЕВА',
  RAVANNA: 'РАВАННА / RAVANNA',
  SELLOUT: 'СЕЛЛАУТ / SELLOUT',
  'КОСТЯ КУЛЯСОВ': 'КОСТЯ КУЛЯСОВ. АНИМАЦИЯ',
  POLNALYUBVI: 'ПОЛНАЛЮБВИ / POLNALYUBVI',
  'ВИА ВОЛГА-ВОЛГА': 'ВИА «ВОЛГА-ВОЛГА»',
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
