import { Headliner } from '../types';
import { findHeadlinerByRadioArtist } from './matchRadioArtist';

function compareHeadlinerPopularity(a: Headliner, b: Headliner): number {
  const listenersDiff = (b.lastfm?.listeners ?? 0) - (a.lastfm?.listeners ?? 0);
  if (listenersDiff !== 0) {
    return listenersDiff;
  }

  const playcountDiff = (b.lastfm?.playcount ?? 0) - (a.lastfm?.playcount ?? 0);
  if (playcountDiff !== 0) {
    return playcountDiff;
  }

  return a.name.localeCompare(b.name, 'ru');
}

export function sortHeadlinersByPopularity(headliners: Headliner[]): Headliner[] {
  return [...headliners].sort(compareHeadlinerPopularity);
}

export type HeadlinerSortMode = 'popularity' | 'debut' | 'visits_desc' | 'visits_asc';

export const HEADLINER_SORT_OPTIONS: { id: HeadlinerSortMode; label: string }[] = [
  { id: 'popularity', label: 'Популярность' },
  { id: 'debut', label: 'Впервые' },
  { id: 'visits_desc', label: 'Чаще на УЛЕТАЕ' },
  { id: 'visits_asc', label: 'Реже на УЛЕТАЕ' },
];

export function isHeadlinerDebutAtYear(headliner: Headliner, year: number): boolean {
  return headliner.years.includes(year) && !headliner.years.some((item) => item < year);
}

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
    case 'debut':
      return items.sort((a, b) => {
        const aDebut = isHeadlinerDebutAtYear(a, year);
        const bDebut = isHeadlinerDebutAtYear(b, year);
        if (aDebut !== bDebut) {
          return aDebut ? -1 : 1;
        }
        return compareHeadlinerPopularity(a, b);
      });
    case 'visits_desc':
      return items.sort((a, b) => {
        const diff = countHeadlinerVisitsUpToYear(b, year) - countHeadlinerVisitsUpToYear(a, year);
        if (diff !== 0) {
          return diff;
        }
        return compareHeadlinerPopularity(a, b);
      });
    case 'visits_asc':
      return items.sort((a, b) => {
        const diff = countHeadlinerVisitsUpToYear(a, year) - countHeadlinerVisitsUpToYear(b, year);
        if (diff !== 0) {
          return diff;
        }
        return compareHeadlinerPopularity(a, b);
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
    return headliner.name.toLocaleLowerCase('ru').includes(normalizedQuery);
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

export function getHeadlinerYears(headliners: Headliner[]): number[] {
  const years = new Set<number>();
  for (const headliner of headliners) {
    for (const year of headliner.years) {
      years.add(year);
    }
  }
  return [...years].sort((a, b) => b - a);
}

export function getLatestHeadlinerYear(headliners: Headliner[]): number | undefined {
  return getHeadlinerYears(headliners)[0];
}

export function getDefaultHeadlinerYear(headliners: Headliner[], festivalYear: number): number {
  const years = getHeadlinerYears(headliners);
  if (years.length === 0) {
    return festivalYear;
  }

  if (years.includes(festivalYear)) {
    return festivalYear;
  }

  return years[0];
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
