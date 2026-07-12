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
    .filter((token) => token.length > 1);
}

function scoreMatch(candidate: string, query: string): number {
  const normalizedCandidate = normalizeArtistName(candidate);
  const normalizedQuery = normalizeArtistName(query);

  if (!normalizedCandidate || !normalizedQuery) {
    return 0;
  }

  if (normalizedCandidate === normalizedQuery) {
    return 100;
  }

  if (
    normalizedCandidate.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedCandidate)
  ) {
    return 80;
  }

  const candidateTokens = tokenize(candidate);
  const queryTokens = tokenize(query);
  if (!candidateTokens.length || !queryTokens.length) {
    return 0;
  }

  const shared = queryTokens.filter((token) => candidateTokens.includes(token)).length;
  return Math.round((shared / Math.max(candidateTokens.length, queryTokens.length)) * 70);
}

function buildRadioQueries(artist: string, title?: string): string[] {
  return [artist, title, artist && title ? `${artist} ${title}` : '']
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

function findBestNamedMatch<T>(
  items: T[],
  artist: string,
  title: string | undefined,
  getLabel: (item: T) => string,
): T | null {
  const queries = buildRadioQueries(artist, title);
  if (!queries.length) {
    return null;
  }

  let best: { item: T; score: number } | null = null;

  for (const item of items) {
    for (const query of queries) {
      const score = scoreMatch(getLabel(item), query);
      if (!best || score > best.score) {
        best = { item, score };
      }
    }
  }

  return best && best.score >= 45 ? best.item : null;
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
  return findBestNamedMatch(futureSchedule, artist, title, (item) => item.artist);
}

export function findHeadlinerByRadioArtist(
  headliners: Headliner[],
  artist: string,
  title?: string,
): Headliner | null {
  return findBestNamedMatch(headliners, artist, title, (item) => item.name);
}
