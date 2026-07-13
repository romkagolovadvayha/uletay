import type { AppData, AutographSession, Headliner, SchedulePerformance } from '@/types';

const IMAGE_TINTS = [
  '#4A1C1C',
  '#3D2E14',
  '#1E3A4A',
  '#2A1F3D',
  '#1A1A1A',
  '#3A1414',
  '#243024',
  '#3A3018',
  '#2E2438',
  '#1F2D3A',
];

function normalizeArtistKey(name: string): string {
  return name
    .toUpperCase()
    .replace(/Ё/g, 'Е')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildHeadlinerId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `hl-${slug || 'artist'}`;
}

function yearFromDate(date?: string): number | undefined {
  if (!date) {
    return undefined;
  }
  const match = date.match(/^(\d{4})/);
  return match ? Number(match[1]) : undefined;
}

function migrateHeadliner(raw: Headliner & { year?: number }): Headliner {
  const years = Array.isArray(raw.years)
    ? [...new Set(raw.years.filter((year) => Number.isFinite(year)))]
    : typeof raw.year === 'number'
      ? [raw.year]
      : [];

  return {
    id: raw.id,
    name: raw.name.trim(),
    description: raw.description?.trim() || raw.name.trim(),
    imageTint: raw.imageTint || IMAGE_TINTS[0],
    imageUrl: raw.imageUrl?.trim() || undefined,
    years: years.sort((a, b) => b - a),
    alternateNames: raw.alternateNames?.map((name) => name.trim()).filter(Boolean),
    linkedHeadlinerIds: raw.linkedHeadlinerIds?.filter(Boolean),
    lastfm: raw.lastfm,
  };
}

function mergeHeadlinersByName(headliners: Headliner[]): Headliner[] {
  const merged = new Map<string, Headliner>();

  for (const raw of headliners) {
    const item = migrateHeadliner(raw);
    const key = normalizeArtistKey(item.name);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, item);
      continue;
    }

    merged.set(key, {
      ...existing,
      description: existing.description || item.description,
      imageUrl: existing.imageUrl ?? item.imageUrl,
      imageTint: existing.imageTint || item.imageTint,
      years: [...new Set([...existing.years, ...item.years])].sort((a, b) => b - a),
      alternateNames: [
        ...new Set([...(existing.alternateNames ?? []), ...(item.alternateNames ?? [])]),
      ].filter(Boolean),
      linkedHeadlinerIds: [
        ...new Set([...(existing.linkedHeadlinerIds ?? []), ...(item.linkedHeadlinerIds ?? [])]),
      ].filter(Boolean),
      lastfm: existing.lastfm ?? item.lastfm,
    });
  }

  return [...merged.values()];
}

function findHeadlinerByArtist(headliners: Headliner[], artist: string): Headliner | undefined {
  const key = normalizeArtistKey(artist);
  return headliners.find((item) => normalizeArtistKey(item.name) === key);
}

function ensureHeadliner(
  headliners: Headliner[],
  artist: string,
  imageUrl?: string,
): Headliner {
  const existing = findHeadlinerByArtist(headliners, artist);
  if (existing) {
    if (!existing.imageUrl && imageUrl) {
      existing.imageUrl = imageUrl;
    }
    return existing;
  }

  const created: Headliner = {
    id: buildHeadlinerId(artist),
    name: artist.trim(),
    description: artist.trim(),
    imageTint: IMAGE_TINTS[headliners.length % IMAGE_TINTS.length],
    imageUrl,
    years: [],
  };
  headliners.push(created);
  return created;
}

export function collectHeadlinerYears(
  headlinerId: string,
  schedule: SchedulePerformance[],
  autographs: AutographSession[],
): number[] {
  const years = new Set<number>();

  for (const item of schedule) {
    if (item.headlinerId === headlinerId) {
      const year = yearFromDate(item.date);
      if (year) {
        years.add(year);
      }
    }
  }

  for (const item of autographs) {
    if (item.headlinerId === headlinerId) {
      const year = yearFromDate(item.date);
      if (year) {
        years.add(year);
      }
    }
  }

  return [...years].sort((a, b) => b - a);
}

export function syncAppHeadliners(data: AppData): AppData {
  let headliners = mergeHeadlinersByName(data.headliners ?? []);

  const schedule = data.schedule.map((item) => {
    const artist = item.artist?.trim();
    let headlinerId = item.headlinerId?.trim();

    if (!headlinerId && artist) {
      headlinerId = ensureHeadliner(headliners, artist, item.imageUrl).id;
    }

    if (headlinerId && !headliners.some((headliner) => headliner.id === headlinerId) && artist) {
      headliners.push({
        id: headlinerId,
        name: artist,
        description: artist,
        imageTint: IMAGE_TINTS[headliners.length % IMAGE_TINTS.length],
        imageUrl: item.imageUrl,
        years: [],
      });
    }

    const headliner = headliners.find((entry) => entry.id === headlinerId);
    const resolvedArtist = headliner?.name ?? artist ?? '';

    const { imageUrl: _imageUrl, ...rest } = item;
    return {
      ...rest,
      headlinerId: headlinerId ?? '',
      artist: resolvedArtist,
    };
  });

  const autographs = data.autographs.map((item) => {
    const artist = item.artist?.trim();
    let headlinerId = item.headlinerId?.trim();

    if (!headlinerId && artist) {
      headlinerId = ensureHeadliner(headliners, artist, item.imageUrl).id;
    }

    if (headlinerId && !headliners.some((headliner) => headliner.id === headlinerId) && artist) {
      headliners.push({
        id: headlinerId,
        name: artist,
        description: artist,
        imageTint: IMAGE_TINTS[headliners.length % IMAGE_TINTS.length],
        imageUrl: item.imageUrl,
        years: [],
      });
    }

    const headliner = headliners.find((entry) => entry.id === headlinerId);
    const resolvedArtist = headliner?.name ?? artist ?? '';

    const { imageUrl: _imageUrl, ...rest } = item;
    return {
      ...rest,
      headlinerId: headlinerId ?? '',
      artist: resolvedArtist,
    };
  });

  headliners = headliners.map((headliner) => ({
    ...headliner,
    years: [...new Set([...headliner.years, ...collectHeadlinerYears(headliner.id, schedule, autographs)])].sort(
      (a, b) => b - a,
    ),
  }));

  return {
    ...data,
    headliners,
    schedule,
    autographs,
  };
}

export function getHeadlinerById(headliners: Headliner[], id?: string | null): Headliner | undefined {
  if (!id) {
    return undefined;
  }
  return headliners.find((item) => item.id === id);
}

export function resolveLinkedArtist(
  item: { headlinerId?: string; artist?: string },
  headliners: Headliner[],
): string {
  return getHeadlinerById(headliners, item.headlinerId)?.name ?? item.artist?.trim() ?? '';
}

export function resolveLinkedImageUrl(
  item: { headlinerId?: string; imageUrl?: string; artist?: string },
  headliners: Headliner[],
): string | undefined {
  return item.imageUrl ?? getHeadlinerById(headliners, item.headlinerId)?.imageUrl;
}
