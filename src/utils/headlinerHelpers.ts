import { Headliner } from '../types';

export function getHeadlinerYears(headliners: Headliner[]): number[] {
  const years = new Set<number>();
  for (const headliner of headliners) {
    for (const year of headliner.years) {
      years.add(year);
    }
  }
  return [...years].sort((a, b) => b - a);
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
  return headliners.filter((item) => item.years.includes(year));
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
