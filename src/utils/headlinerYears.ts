import type { Headliner } from '../types';

export function getHeadlinerYears(headliners: Headliner[]): number[] {
  const years = new Set<number>();
  for (const headliner of headliners) {
    for (const year of headliner.years) {
      years.add(year);
    }
  }
  return [...years].sort((a, b) => b - a);
}

/** Years for the filter and indexable archive pages. */
export function getSelectableHeadlinerYears(headliners: Headliner[], festivalYear: number): number[] {
  const years = getHeadlinerYears(headliners);
  return years.includes(festivalYear)
    ? years
    : [festivalYear, ...years].sort((a, b) => b - a);
}
