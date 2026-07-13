import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { festAssetUrl } from './repo-assets';

type SourcesFile = {
  artists: Record<string, string>;
};

const artistAliases: Record<string, string> = {
  ГОРШЕНЕВ: 'ГОРШЕНЕВА',
  RAVANNA: 'РАВАННА / RAVANNA',
  SELLOUT: 'СЕЛЛАУТ / SELLOUT',
  'КОСТЯ КУЛЯСОВ': 'КОСТЯ КУЛЯСОВ. АНИМАЦИЯ',
  POLNALYUBVI: 'ПОЛНАЛЮБВИ / POLNALYUBVI',
  ПОЛНАЛЮБВИ: 'ПОЛНАЛЮБВИ / POLNALYUBVI',
  'ВИА ВОЛГА-ВОЛГА': 'ВИА «ВОЛГА-ВОЛГА»',
};

function normalize(name: string): string {
  return name
    .toUpperCase()
    .replace(/Ё/g, 'Е')
    .replace(/\s+/g, ' ')
    .trim();
}

let cachedSources: Record<string, string> | null = null;

function resolveSourcesPath(): string | null {
  const candidates = [
    path.join(process.cwd(), 'data', 'fest-artist-sources.json'),
    path.resolve(process.cwd(), '..', 'scripts', 'fest-artist-sources.json'),
    path.resolve(process.cwd(), 'scripts', 'fest-artist-sources.json'),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function loadSources(): Record<string, string> {
  if (cachedSources) return cachedSources;

  const sourcesPath = resolveSourcesPath();
  if (!sourcesPath) {
    cachedSources = {};
    return cachedSources;
  }

  try {
    const raw = readFileSync(sourcesPath, 'utf8');
    const parsed = JSON.parse(raw) as SourcesFile;
    cachedSources = parsed.artists ?? {};
  } catch {
    cachedSources = {};
  }

  return cachedSources;
}

function uploadsPathToFestAsset(url: string): string | undefined {
  const match = url.match(/^\/api\/uploads\/images\/(.+)$/);
  if (!match?.[1]) return undefined;
  return festAssetUrl('images', 'artists', match[1]);
}

function resolveArtistKey(artist: string): string | undefined {
  const sources = loadSources();
  const candidates = [artist, artistAliases[artist]].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (sources[candidate]) return candidate;

    const normalized = normalize(candidate);
    for (const key of Object.keys(sources)) {
      if (normalize(key) === normalized) return key;
    }

    const primary = normalize(candidate.split('/')[0]);
    for (const key of Object.keys(sources)) {
      const keyPrimary = normalize(key.split('/')[0]);
      if (keyPrimary === primary) return key;
    }
  }

  return undefined;
}

export function lookupFestArtistAssetUrl(artist?: string | null): string | undefined {
  if (!artist?.trim()) return undefined;

  const key = resolveArtistKey(artist.trim());
  if (!key) return undefined;

  const sourceUrl = loadSources()[key];
  return sourceUrl ? uploadsPathToFestAsset(sourceUrl) : undefined;
}

export function lookupFestArtistUploadUrl(artist?: string | null): string | undefined {
  if (!artist?.trim()) return undefined;

  const key = resolveArtistKey(artist.trim());
  if (!key) return undefined;

  const sourceUrl = loadSources()[key]?.trim();
  if (!sourceUrl) return undefined;

  if (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://') || sourceUrl.startsWith('/api/uploads/')) {
    return sourceUrl;
  }

  return undefined;
}
