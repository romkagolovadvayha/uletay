import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HISTORICAL_YEAR_END,
  HISTORICAL_YEAR_START,
  historicalHeadlinersByYear,
} from './headliners-historical-data.mjs';

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
  КНЯЗЬ: 'КНЯZZ',
  'KНЯZZ': 'КНЯZZ',
  'ЧИЖ & КО': 'ЧИЖ & CO',
  ВОСКРЕСЕНЬЕ: 'ВОСКРЕСЕНИЕ',
  '7РАСА': '7 РАСА',
  'РЯЗАНОFF': 'РЯЗАНOFF',
  TATOOIN: 'TATTOOIN',
  VALIEDOLLZ: 'VALIEDOLLZ BRASSCORE BAND',
  АНИМАЦИЯ: 'КОСТЯ КУЛЯСОВ. АНИМАЦИЯ',
  'ЭПИДЕМИЯ (ЭЛЬФИЙСКАЯ РУКОПИСЬ)': 'ЭПИДЕМИЯ',
  'ЭПИДЕМИЯ (СОКРОВИЩЕ ЭНИИ)': 'ЭПИДЕМИЯ',
  'ВАДИМ САМОЙЛОВ "АГАТА КРИСТИ"': 'ВАДИМ САМОЙЛОВ',
  'ВАДИМ САМОЙЛОВ (АГАТА КРИСТИ)': 'ВАДИМ САМОЙЛОВ',
  'АЛЕКСЕЙ ПОДДУБНЫЙ (ДЖАНГО)': 'ДЖАНГО',
  ДУБИНИН: 'ВИТАЛИЙ ДУБИНИН',
  STIGMATA: 'СТИГМАТА / STIGMATA',
  'СТИГМАТА / STIGMATA': 'СТИГМАТА / STIGMATA',
  'ЧИЖ & CO.': 'ЧИЖ & CO',
  'THE ЧИЖ & CO': 'ЧИЖ & CO',
  'ЧЁРНЫЙ ОБЕЛИСК': 'ЧЕРНЫЙ ОБЕЛИСК',
  'ТРОЛЛЬ ГНЁТ ЕЛЬ': 'ТРОЛЛЬ ГНЕТ ЕЛЬ',
  'ТРОЛЛЬ ГНЕТ ЕЛЬ': 'ТРОЛЛЬ ГНЕТ ЕЛЬ',
  'F.P.G': 'F.P.G.',
  FPG: 'F.P.G.',
  'БЕZ Б': 'БЕЗ Б / BEZ B',
  'БЕZБ': 'БЕЗ Б / BEZ B',
  БАГИРА: 'БАГИРА / BAGIRA',
  BAGIRA: 'БАГИРА / BAGIRA',
  'VERE DICTUM': 'ВЕРЕ ДИКТУМ / VERE DICTUM',
  HELVEGEN: 'ХЕЛЬВЕГЕН / HELVEGEN',
  LASCALA: 'ЛАСКАЛА / LASCALA',
  'ВОЛГА-ВОЛГА': 'ВИА «ВОЛГА-ВОЛГА»',
  KDRR: 'КДРР / KDRR',
  'ЕКАТЕРИНА ЯШНИКОВА': 'ЯШНИКОВА',
  'МЁРТВЫЕ ОСЫ': 'МЁРТВЫЕ ОСЫ',
  SELLOUT: 'СЕЛЛАУТ / SELLOUT',
  DISTEMPER: 'ДИСТЕМПЕР / DISTEMPER',
  'ВКЛЮЧАЙ МИКРОФОН': 'ВКЛЮЧАЙ МИКРОФОН!',
  'ОП. ПЛАСТИЛИН': 'ОПЕРАЦИЯ ПЛАСТИЛИН',
  'VERE DIKTUM': 'ВЕРЕ ДИКТУМ / VERE DICTUM',
  '##### (5 DIEZ)': '5 DIEZ',
  'LORI LORI': 'LORI! LORI!',
  'DРУГОЙ ВЕТЕР': 'ДРУГОЙ ВЕТЕР',
  'MOДEM': 'МОДЕМ',
  '[AMATORY]': 'AMATORY',
  'ANAСONDAZ': 'ANACONDAZ',
  ТАРАКАНЫ: 'ТАРАКАНЫ!',
  'КИС КИС': 'КИС-КИС',
  ГУДТАЙМС: 'GOOD TIMES',
  'ТУРБИНА ТУРИСТА': '2RBINA 2RISTA',
  'ANIMAL ДЖАZ': 'ANIMAL ДЖAZ',
  'ANIMAL ДЖAZ': 'ANIMAL ДЖAZ',
  'СКАNВОРД': "СКА'N'ВОРД",
  'ПАВЕЛ ПИКОВСКИЙ & ХЬЮГО': 'ПАВЕЛ ПИКОВСКИЙ',
  'СУРГАНОВА и оркестр': 'СУРГАНОВА И ОРКЕСТР',
  'СУРГАНОВА И ОРКЕСТР': 'СУРГАНОВА И ОРКЕСТР',
  'АГАТА КРИСТИ': 'АГАТА КРИСТИ',
  SMEX: 'СМЕХ',
  'БЕЗ Б': 'БЕЗ Б / BEZ B',
  RAVANNA: 'РАВАННА / RAVANNA',
  CASUAL: 'КЭЖУАЛ / CASUAL',
  '7000$': 'СЕМЬ ШТУК БАКСОВ / 7000$',
  'МЕРТВЫЕ ОСЫ': 'МЁРТВЫЕ ОСЫ',
  'ВИА ВОЛГА-ВОЛГА': 'ВИА «ВОЛГА-ВОЛГА»',
  INDULGENCIA: 'ИНДУЛЬГЕНЦИЯ',
  СКАНВОРД: "СКА'N'ВОРД",
  ПОЛНАЛЮБВИ: 'ПОЛНАЛЮБВИ / POLNALYUBVI',
  'ФАН МОД': 'ФАН МОД / FUN MODE',
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

export function getCanonicalArtistKey(name) {
  return normalizeArtistKey(canonicalHeadlinerName(name));
}

export function getLooseArtistKey(name) {
  return getCanonicalArtistKey(name)
    .normalize('NFKC')
    .replace(/[^A-ZА-Я0-9]+/g, '');
}

function getHeadlinerNames(headliner) {
  return [
    headliner.name,
    ...(Array.isArray(headliner.alternateNames) ? headliner.alternateNames : []),
  ].filter((name) => typeof name === 'string' && name.trim());
}

function levenshteinDistance(left, right) {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous = current;
  }

  return previous[right.length];
}

function getNameMatch(targetName, candidateName, isAlternateName) {
  if (getCanonicalArtistKey(targetName) === getCanonicalArtistKey(candidateName)) {
    return {
      method: isAlternateName ? 'alternate' : 'exact',
      score: isAlternateName ? 980 : 1000,
    };
  }

  const targetLoose = getLooseArtistKey(targetName);
  const candidateLoose = getLooseArtistKey(candidateName);
  if (targetLoose === candidateLoose) {
    return {
      method: isAlternateName ? 'alternate-loose' : 'loose',
      score: isAlternateName ? 880 : 900,
    };
  }

  // Do not fuzzy-match combined billing entries to one of their members.
  if (
    /[,;]/.test(targetName) ||
    /[,;]/.test(candidateName) ||
    Math.min(targetLoose.length, candidateLoose.length) < 6
  ) {
    return null;
  }

  const distance = levenshteinDistance(targetLoose, candidateLoose);
  const maxLength = Math.max(targetLoose.length, candidateLoose.length);
  const allowedDistance = maxLength >= 12 ? 2 : 1;
  if (distance > allowedDistance) {
    return null;
  }

  return {
    method: isAlternateName ? 'alternate-fuzzy' : 'fuzzy',
    score: (isAlternateName ? 780 : 800) - distance * 30,
    distance,
  };
}

function getCandidatePreference(headliner, targetName) {
  const years = Array.isArray(headliner.years) ? headliner.years : [];
  let score = years.some((year) => year >= 2026) ? 500 : 0;

  if (normalizeArtistKey(headliner.name) === normalizeArtistKey(targetName)) score += 80;
  if (headliner.imageUrl) score += 20;
  if (headliner.lastfm) score += 20;
  if (headliner.alternateNames?.length) score += 10;
  if ((headliner.description?.trim().length ?? 0) > headliner.name.length) score += 5;

  return score;
}

export function findBestExistingHeadliner(headliners, targetName) {
  const candidates = [];

  headliners.forEach((headliner, index) => {
    let bestNameMatch = null;
    getHeadlinerNames(headliner).forEach((candidateName, nameIndex) => {
      const match = getNameMatch(targetName, candidateName, nameIndex > 0);
      if (match && (!bestNameMatch || match.score > bestNameMatch.score)) {
        bestNameMatch = { ...match, candidateName };
      }
    });

    if (bestNameMatch) {
      candidates.push({
        index,
        headliner,
        ...bestNameMatch,
        totalScore: bestNameMatch.score + getCandidatePreference(headliner, targetName),
      });
    }
  });

  candidates.sort((left, right) => (
    right.totalScore - left.totalScore ||
    right.score - left.score ||
    left.index - right.index
  ));

  if (!candidates.length) {
    return null;
  }

  const best = candidates[0];
  const runnerUp = candidates[1];
  if (
    best.method.includes('fuzzy') &&
    runnerUp &&
    runnerUp.totalScore === best.totalScore
  ) {
    return null;
  }

  return {
    ...best,
    candidateCount: candidates.length,
    alternatives: candidates.slice(1).map((candidate) => candidate.headliner.name),
  };
}

export function getHistoricalManagedYears() {
  return Array.from(
    { length: HISTORICAL_YEAR_END - HISTORICAL_YEAR_START + 1 },
    (_, index) => HISTORICAL_YEAR_START + index,
  );
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
    const canonical = canonicalHeadlinerName(name);
    const candidates = [canonical, name, name.toUpperCase(), canonical.toUpperCase()];

    for (const candidate of candidates) {
      const key = getCanonicalArtistKey(candidate);
      if (artists[candidate]) return artists[candidate];
      if (artists[key]) return artists[key];
      for (const [sourceKey, url] of Object.entries(artists)) {
        if (getCanonicalArtistKey(sourceKey) === key) return url;
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export { loadArtistImageUrl };

export function buildHistoricalHeadliners() {
  const byKey = new Map();

  for (const [yearStr, names] of Object.entries(historicalHeadlinersByYear)) {
    const year = Number(yearStr);
    for (const rawName of names) {
      const name = canonicalHeadlinerName(rawName);
      const key = getCanonicalArtistKey(name);
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
    merged.map((item, index) => [getCanonicalArtistKey(item.name), index]),
  );

  let added = 0;
  let updated = 0;

  for (const item of historical) {
    const key = getCanonicalArtistKey(item.name);
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
      imageUrl: current.imageUrl ?? item.imageUrl,
    };

    if (yearsChanged) {
      updated += 1;
    }
  }

  return { merged, added, updated, preserved: existing.length };
}

/**
 * Replace every historical year tag with the official media-page mapping.
 * Years outside 2007..2025 — especially 2026 — are copied byte-for-byte.
 */
export function reconcileHistoricalHeadliners(existing, historical) {
  const managedYears = new Set(getHistoricalManagedYears());
  const originalYears = existing.map((item) => (
    Array.isArray(item.years) ? [...item.years] : []
  ));
  const merged = existing.map((item) => ({
    ...item,
    years: (Array.isArray(item.years) ? item.years : [])
      .filter((year) => !managedYears.has(year)),
  }));

  let added = 0;
  const matches = [];

  for (const target of historical) {
    const match = findBestExistingHeadliner(merged, target.name);

    if (!match) {
      merged.push(target);
      added += 1;
      continue;
    }

    const existingIndex = match.index;
    const current = merged[existingIndex];
    merged[existingIndex] = {
      ...current,
      years: [...new Set([...current.years, ...target.years])].sort((a, b) => b - a),
      description: current.description?.trim() || target.description,
      imageTint: current.imageTint || target.imageTint,
      imageUrl: current.imageUrl ?? target.imageUrl,
    };

    if (
      match.method !== 'exact' ||
      match.candidateCount > 1 ||
      normalizeArtistKey(current.name) !== normalizeArtistKey(target.name)
    ) {
      matches.push({
        sourceName: target.name,
        existingName: current.name,
        method: match.method,
        alternatives: match.alternatives,
        ...(match.distance === undefined ? {} : { distance: match.distance }),
      });
    }
  }

  let changed = 0;
  let addedYearTags = 0;
  let removedYearTags = 0;

  existing.forEach((_, index) => {
    const before = new Set(originalYears[index]);
    const after = new Set(merged[index]?.years ?? []);

    for (const year of before) {
      if (!after.has(year)) {
        removedYearTags += 1;
      }
    }
    for (const year of after) {
      if (!before.has(year)) {
        addedYearTags += 1;
      }
    }
    if (
      before.size !== after.size ||
      [...before].some((year) => !after.has(year))
    ) {
      changed += 1;
    }
  });

  for (const item of merged.slice(existing.length)) {
    addedYearTags += item.years.length;
  }

  return {
    merged,
    added,
    changed,
    addedYearTags,
    removedYearTags,
    matches,
    preserved: existing.length,
  };
}
