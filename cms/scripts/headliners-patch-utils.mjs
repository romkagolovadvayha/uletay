import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { historicalHeadlinersByYear } from './headliners-historical-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const artistAliases = {
  ГОРШЕНЕВ: 'ГОРШЕНЕВ',
  ГОРШЕНЁВ: 'ГОРШЕНЕВ',
  'ПРОЕКТ ГОРШЕНЕВ': 'ГОРШЕНЕВ',
  'ПРОЕКТ ГОРШЕНЁВ': 'ГОРШЕНЕВ',
  АНИМАЦИЯ: 'КОСТЯ КУЛЯСОВ. АНИМАЦИЯ',
  STIGMATA: 'STIGMATA',
  'СТИГМАТА / STIGMATA': 'STIGMATA',
  'ЧИЖ & CO.': 'ЧИЖ & CO',
  'THE ЧИЖ & CO': 'ЧИЖ & CO',
  'ЧИЖ & CO.': 'ЧИЖ & CO',
  'ЧЁРНЫЙ ОБЕЛИСК': 'ЧЕРНЫЙ ОБЕЛИСК',
  'ТРОЛЛЬ ГНЁТ ЕЛЬ': 'ТРОЛЛЬ ГНЕТ ЕЛЬ',
  'ТРОЛЛЬ ГНЕТ ЕЛЬ': 'ТРОЛЛЬ ГНЕТ ЕЛЬ',
  'F.P.G': 'F.P.G.',
  FPG: 'F.P.G.',
  'БЕZ Б': 'БЕZ Б / BEZ B',
  'БЕZБ': 'БЕZ Б / BEZ B',
};

export function normalizeArtistKey(name) {
  return name
    .toUpperCase()
    .replace(/Ё/g, 'Е')
    .replace(/\s+/g, ' ')
    .trim();
}

export function canonicalHeadlinerName(name) {
  const trimmed = name.trim();
  const alias = artistAliases[normalizeArtistKey(trimmed)];
  return alias ?? trimmed;
}

export function buildHeadlinerId(name) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `hl-${slug || 'artist'}`;
}

function resolveSourcesPath() {
  const candidates = [
    path.join(__dirname, '..', 'data', 'fest-artist-sources.json'),
    path.join(__dirname, '..', '..', 'scripts', 'fest-artist-sources.json'),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function loadArtistImageUrl(name) {
  const sourcesPath = resolveSourcesPath();
  if (!sourcesPath) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(readFileSync(sourcesPath, 'utf8'));
    const artists = parsed.artists ?? {};
    const key = normalizeArtistKey(name);
    return artists[key] ?? artists[name.toUpperCase()];
  } catch {
    return undefined;
  }
}

export function buildHistoricalHeadliners() {
  const byKey = new Map();

  for (const [yearStr, names] of Object.entries(historicalHeadlinersByYear)) {
    const year = Number(yearStr);
    for (const rawName of names) {
      const name = canonicalHeadlinerName(rawName);
      const key = normalizeArtistKey(name);
      const entry = byKey.get(key) ?? { name, years: new Set() };
      entry.years.add(year);
      byKey.set(key, entry);
    }
  }

  return [...byKey.values()].map((entry, index) => {
    const years = [...entry.years].sort((a, b) => b - a);
    const imageUrl = loadArtistImageUrl(entry.name);
    return {
      id: buildHeadlinerId(entry.name),
      name: entry.name,
      description: entry.name,
      imageTint: IMAGE_TINTS[index % IMAGE_TINTS.length],
      years,
      ...(imageUrl ? { imageUrl } : {}),
    };
  });
}

export function mergeHistoricalHeadliners(existing, historical) {
  const merged = [...existing];
  const indexByKey = new Map(
    merged.map((item, index) => [normalizeArtistKey(item.name), index]),
  );

  let added = 0;
  let updated = 0;

  for (const item of historical) {
    const key = normalizeArtistKey(item.name);
    const existingIndex = indexByKey.get(key);

    if (existingIndex === undefined) {
      merged.push(item);
      indexByKey.set(key, merged.length - 1);
      added += 1;
      continue;
    }

    const current = merged[existingIndex];
    const nextYears = [...new Set([...(current.years ?? []), ...item.years])].sort((a, b) => b - a);
    const yearsChanged = JSON.stringify(nextYears) !== JSON.stringify(current.years ?? []);

    merged[existingIndex] = {
      ...current,
      years: nextYears,
      description: current.description?.trim() || item.description,
      imageTint: current.imageTint || item.imageTint,
      ...(current.imageUrl ? { imageUrl: current.imageUrl } : item.imageUrl ? { imageUrl: item.imageUrl } : {}),
    };

    if (yearsChanged) {
      updated += 1;
    }
  }

  return { merged, added, updated, preserved: existing.length };
}
