export function formatHeadlinerYears(years: number[]): string {
  if (!years.length) {
    return '—';
  }
  return [...years].sort((a, b) => b - a).join(', ');
}
