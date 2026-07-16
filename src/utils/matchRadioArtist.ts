import { Headliner, SchedulePerformance } from '../types';
import { parseDateTime } from './scheduleHelpers';

function normalizeArtistName(value: string): string {
  return value
    .toUpperCase()
    .replace(/ё/g, 'Е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeArtistName(value)
    .split(' ')
    .filter(Boolean);
}

function sortedTokenKey(tokens: string[]): string {
  return [...tokens].sort().join(' ');
}

function buildRadioQueries(artist: string, title?: string): string[] {
  return [artist, title, artist && title ? `${artist} ${title}` : '']
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

/**
 * Match by exact/substring text, or by the same words in any order
 * ("Вячеслав Бутусов" ≈ "Бутусов Вячеслав"). Longer overlap wins.
 */
function containmentScore(candidate: string, query: string): number {
  const normalizedCandidate = normalizeArtistName(candidate);
  const normalizedQuery = normalizeArtistName(query);

  if (!normalizedCandidate || !normalizedQuery) {
    return 0;
  }

  if (normalizedCandidate === normalizedQuery) {
    return 1000 + normalizedCandidate.length;
  }

  if (normalizedCandidate.includes(normalizedQuery)) {
    return 500 + normalizedQuery.length;
  }

  if (normalizedQuery.includes(normalizedCandidate)) {
    return 500 + normalizedCandidate.length;
  }

  const candidateTokens = tokenize(candidate);
  const queryTokens = tokenize(query);
  if (!candidateTokens.length || !queryTokens.length) {
    return 0;
  }

  // Same words, different order.
  if (sortedTokenKey(candidateTokens) === sortedTokenKey(queryTokens)) {
    return 900 + candidateTokens.length;
  }

  // All words of the shorter name appear in the longer one (any order).
  const [shorter, longer] =
    candidateTokens.length <= queryTokens.length
      ? [candidateTokens, queryTokens]
      : [queryTokens, candidateTokens];
  const longerSet = new Set(longer);
  if (shorter.every((token) => longerSet.has(token))) {
    return 400 + shorter.length * 20 + shorter.join('').length;
  }

  return 0;
}

function findBestNamedMatch<T>(
  items: T[],
  artist: string,
  title: string | undefined,
  getLabels: (item: T) => string[],
): T | null {
  const queries = buildRadioQueries(artist, title);
  if (!queries.length) {
    return null;
  }

  let best: { item: T; score: number } | null = null;

  for (const item of items) {
    for (const label of getLabels(item)) {
      for (const query of queries) {
        const score = containmentScore(label, query);
        if (score > 0 && (!best || score > best.score)) {
          best = { item, score };
        }
      }
    }
  }

  return best?.item ?? null;
}

function isFuturePerformance(performance: SchedulePerformance, now: Date): boolean {
  return parseDateTime(performance.date, performance.startTime) > now;
}

export function findSchedulePerformanceByRadioArtist(
  schedule: SchedulePerformance[],
  artist: string,
  title?: string,
  now: Date = new Date(),
): SchedulePerformance | null {
  const futureSchedule = schedule.filter((item) => isFuturePerformance(item, now));
  return findBestNamedMatch(futureSchedule, artist, title, (item) => [item.artist]);
}

export function findHeadlinerByRadioArtist(
  headliners: Headliner[],
  artist: string,
  _title?: string,
): Headliner | null {
  // Match only the on-air artist against headliner name / alternateNames (substring, not exact).
  return findBestNamedMatch(headliners, artist, undefined, (item) =>
    [item.name, ...(item.alternateNames ?? [])].filter(Boolean),
  );
}
