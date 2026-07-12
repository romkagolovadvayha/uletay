import { Headliner } from '../types';

export function getHeadlinerYears(headliners: Headliner[]): number[] {
  const years = new Set(headliners.map((item) => item.year));
  return [...years].sort((a, b) => b - a);
}

export function getDefaultHeadlinerYear(headliners: Headliner[], festivalYear: number): number {
  const years = getHeadlinerYears(headliners);
  if (years.length === 0) {
    return festivalYear + 1;
  }

  const nextYear = festivalYear + 1;
  if (years.includes(nextYear)) {
    return nextYear;
  }

  return years[0];
}

export function filterHeadlinersByYear(headliners: Headliner[], year: number): Headliner[] {
  return headliners.filter((item) => item.year === year);
}

export function buildHeadlinerYearCategories(years: number[]) {
  return years.map((year) => ({
    id: String(year),
    label: String(year),
  }));
}
