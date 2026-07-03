import festSources from '../../scripts/fest-artist-sources.json';

const byNorm = new Map<string, string>();

function normalize(name: string): string {
  return name
    .toUpperCase()
    .replace(/Ё/g, 'Е')
    .replace(/\s+/g, ' ')
    .trim();
}

for (const [artist, url] of Object.entries(festSources.artists)) {
  byNorm.set(normalize(artist), url);
  const primary = artist.split('/')[0].trim();
  byNorm.set(normalize(primary), url);
}

export function getFestArtistImageUrl(artist?: string | null): string | undefined {
  if (!artist) return undefined;

  const exact = festSources.artists[artist as keyof typeof festSources.artists];
  if (exact) return exact;

  const n = normalize(artist);
  if (byNorm.has(n)) return byNorm.get(n);

  const primary = normalize(artist.split('/')[0]);
  if (byNorm.has(primary)) return byNorm.get(primary);

  for (const [name, url] of byNorm) {
    if (n.includes(name) || name.includes(n)) {
      return url;
    }
  }

  return undefined;
}
