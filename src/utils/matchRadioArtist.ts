import { SchedulePerformance } from '../types';

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

export function findSchedulePerformanceByRadioArtist(
  schedule: SchedulePerformance[],
  artist: string,
  title?: string,
): SchedulePerformance | null {
  const queries = [artist, title, artist && title ? `${artist} ${title}` : '']
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (!queries.length) {
    return null;
  }

  let best: { performance: SchedulePerformance; score: number } | null = null;

  for (const performance of schedule) {
    for (const query of queries) {
      const score = scoreMatch(performance.artist, query);
      if (!best || score > best.score) {
        best = { performance, score };
      }
    }
  }

  return best && best.score >= 45 ? best.performance : null;
}
