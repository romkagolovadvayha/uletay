import type { FestivalInfo } from '../types';

const ESCAPE = '~';

/**
 * Keeps an entity id inside one URL segment without relying on encoded slashes,
 * which nginx and client-side routers may normalize differently.
 */
export function encodeSeoRouteId(value: string): string {
  return value
    .replaceAll(ESCAPE, '~7E')
    .replaceAll('/', '~2F')
    .replaceAll('.', '~2E');
}

export function decodeSeoRouteId(value: string): string {
  return value
    .replaceAll(/~2F/gi, '/')
    .replaceAll(/~2E/gi, '.')
    .replaceAll(/~7E/gi, ESCAPE);
}

export function decodeSeoRouteParam(value: string): string {
  try {
    return decodeSeoRouteId(decodeURIComponent(value));
  } catch {
    return decodeSeoRouteId(value);
  }
}

export function isDateWithinFestival(date: string, festival: FestivalInfo): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    && date >= festival.startDate
    && date <= festival.endDate;
}

function addUtcDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf())) {
    return date;
  }
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function festivalDateTime(date: string, time: string): string {
  return `${date}T${time}:00+04:00`;
}

export function festivalEndDateTime(date: string, startTime: string, endTime: string): string {
  const endDate = endTime <= startTime ? addUtcDays(date, 1) : date;
  return festivalDateTime(endDate, endTime);
}
