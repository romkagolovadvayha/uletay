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
