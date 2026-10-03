import { Headliner } from '../types';
import { findHeadlinerByRadioArtist } from './matchRadioArtist';
import { getHeadlinerGroupPopularity } from './headlinerGroups';
import { getHeadlinerYears } from './headlinerYears';
export { getHeadlinerYears, getSelectableHeadlinerYears } from './headlinerYears';

function compareHeadlinerPopularity(a: Headliner, b: Headliner, allHeadliners: Headliner[]): number {
  const aStats = getHeadlinerGroupPopularity(a, allHeadliners);
  const bStats = getHeadlinerGroupPopularity(b, allHeadliners);
  const listenersDiff = bStats.listeners - aStats.listeners;
  if (listenersDiff !== 0) {
    return listenersDiff;
  }

  const playcountDiff = bStats.playcount - aStats.playcount;
  if (playcountDiff !== 0) {
    return playcountDiff;
  }

  return a.name.localeCompare(b.name, 'ru');
}

export function sortHeadlinersByPopularity(headliners: Headliner[]): Headliner[] {
  return [...headliners].sort((a, b) => compareHeadlinerPopularity(a, b, headliners));
}

export type HeadlinerSortMode = 'popularity' | 'visits_desc' | 'visits_asc';

export const HEADLINER_SORT_OPTIONS: { id: HeadlinerSortMode; label: string }[] = [
  { id: 'popularity', label: 'Популярность' },
  { id: 'visits_desc', label: 'Чаще на УЛЕТАЕ' },
  { id: 'visits_asc', label: 'Реже на УЛЕТАЕ' },
];

export function countHeadlinerVisitsUpToYear(headliner: Headliner, year: number): number {
  return headliner.years.filter((item) => item <= year).length;
}

export function sortHeadliners(
  headliners: Headliner[],
  mode: HeadlinerSortMode,
  year: number,
): Headliner[] {
  const items = [...headliners];

  switch (mode) {
    case 'visits_desc':
      return items.sort((a, b) => {
        const diff = countHeadlinerVisitsUpToYear(b, year) - countHeadlinerVisitsUpToYear(a, year);
        if (diff !== 0) {
          return diff;
        }
        return compareHeadlinerPopularity(a, b, headliners);
      });
    case 'visits_asc':
      return items.sort((a, b) => {
        const diff = countHeadlinerVisitsUpToYear(a, year) - countHeadlinerVisitsUpToYear(b, year);
        if (diff !== 0) {
          return diff;
        }
        return compareHeadlinerPopularity(a, b, headliners);
      });
    case 'popularity':
    default:
      return sortHeadlinersByPopularity(items);
  }
}

export function filterHeadlinersList(
  headliners: Headliner[],
  options: { year: number; query: string; sort: HeadlinerSortMode },
): Headliner[] {
  const normalizedQuery = options.query.trim().toLocaleLowerCase('ru');
  const filtered = headliners.filter((headliner) => {
    if (!headliner.years.includes(options.year)) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    return (
      headliner.name.toLocaleLowerCase('ru').includes(normalizedQuery) ||
      headliner.alternateNames?.some((name) =>
        name.toLocaleLowerCase('ru').includes(normalizedQuery),
      )
    );
  });

  return sortHeadliners(filtered, options.sort, options.year);
}

export function resolveSimilarHeadliners(
  headliners: Headliner[],
  currentHeadlinerId: string,
  similarArtists: { name: string }[],
): Headliner[] {
  const seen = new Set<string>();
  const result: Headliner[] = [];

  for (const artist of similarArtists) {
    const match = findHeadlinerByRadioArtist(headliners, artist.name);
    if (!match || match.id === currentHeadlinerId || seen.has(match.id)) {
      continue;
    }
    seen.add(match.id);
    result.push(match);
  }

  return sortHeadlinersByPopularity(result);
}

export function getLatestHeadlinerYear(headliners: Headliner[]): number | undefined {
  return getHeadlinerYears(headliners)[0];
}

export function getDefaultHeadlinerYear(headliners: Headliner[], festivalYear: number): number {
  const years = getHeadlinerYears(headliners);
  if (years.length === 0) {
    return festivalYear;
  }

  // Upcoming festival year with no lineup yet — open that year so empty state is visible.
  if (!years.includes(festivalYear)) {
    return festivalYear;
  }

  // Prefer the freshest year that has headliners (e.g. 2027 over 2026).
  return years[0];
}

/** Up to `limit` prior years that already have headliners (newest first). */
export function getPreviousHeadlinerYears(
  headliners: Headliner[],
  referenceYear: number,
  limit = 3,
): number[] {
  return getHeadlinerYears(headliners)
    .filter((year) => year < referenceYear)
    .slice(0, limit);
}

export function filterHeadlinersByYear(headliners: Headliner[], year: number): Headliner[] {
  return sortHeadlinersByPopularity(headliners.filter((item) => item.years.includes(year)));
}

export function formatHeadlinerYears(years: number[]): string {
  return [...years].sort((a, b) => b - a).join(' · ');
}

export function buildHeadlinerYearCategories(years: number[]) {
  return years.map((year) => ({
    id: String(year),
    label: String(year),
  }));
}

export function hasScheduleForYear(
  schedule: { date: string }[],
  year: number,
): boolean {
  const prefix = `${year}-`;
  return schedule.some((item) => item.date.startsWith(prefix));
}
