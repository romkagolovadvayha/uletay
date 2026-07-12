import { AutographSession, SchedulePerformance, Stage, StageId } from '../types';
import { getStageColor } from '../config/api';
import {
  addDaysToDateString,
  FESTIVAL_TIMEZONE,
  formatFestivalClock,
  getCurrentFestivalDayDate,
  getFestivalClockParts,
  getFestivalDayWindow,
  parseFestivalDateOnly,
  parseFestivalLocalDateTime,
} from './festivalTime';

export { filterByFestivalDay } from './festivalTime';

export type TimedStatus = 'live' | 'upcoming' | 'past';

export function parseDateTime(date: string, time: string): Date {
  return parseFestivalLocalDateTime(date, time);
}

export function getEndDateTime(date: string, startTime: string, endTime: string): Date {
  const start = parseDateTime(date, startTime);
  let end = parseDateTime(date, endTime);

  if (end <= start) {
    end = parseDateTime(addDaysToDateString(date, 1), endTime);
  }

  return end;
}

export function getTimedStatus(start: Date, end: Date, now = new Date()): TimedStatus {
  if (now >= start && now < end) {
    return 'live';
  }
  if (now < start) {
    return 'upcoming';
  }
  return 'past';
}

export function sortByStartTime<T extends { date: string; startTime: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => parseDateTime(a.date, a.startTime).getTime() - parseDateTime(b.date, b.startTime).getTime(),
  );
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`;
}

export { capPerformanceEndTime, MAX_PERFORMANCE_DURATION_MINUTES } from './performanceTime';

export const SOON_WINDOW_MS = 30 * 60 * 1000;

export function isStartingSoon(date: string, startTime: string, now = new Date()): boolean {
  const start = parseDateTime(date, startTime);
  const diffMs = start.getTime() - now.getTime();
  return diffMs > 0 && diffMs <= SOON_WINDOW_MS;
}

export function formatDateLabel(date: string): string {
  const parsed = parseFestivalDateOnly(date);
  const formatter = new Intl.DateTimeFormat('ru-RU', {
    timeZone: FESTIVAL_TIMEZONE,
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });
  return formatter.format(parsed);
}

export function formatDayMonthLabel(date: string): string {
  const parsed = parseFestivalDateOnly(date);
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: FESTIVAL_TIMEZONE,
    day: 'numeric',
    month: 'long',
  }).format(parsed);
}

export function formatShortDate(date: string): string {
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
}

export function formatDateTabParts(date: string): { day: string; month: string; weekday: string } {
  const parsed = parseFestivalDateOnly(date);
  const day = new Intl.DateTimeFormat('ru-RU', { timeZone: FESTIVAL_TIMEZONE, day: 'numeric' }).format(parsed);
  const month = new Intl.DateTimeFormat('ru-RU', {
    timeZone: FESTIVAL_TIMEZONE,
    day: 'numeric',
    month: 'long',
  })
    .format(parsed)
    .replace(/^\d+\s*/, '')
    .toLowerCase();
  const weekday = new Intl.DateTimeFormat('ru-RU', { timeZone: FESTIVAL_TIMEZONE, weekday: 'long' })
    .format(parsed)
    .toUpperCase();

  return { day, month, weekday };
}

export function getFestivalDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = startDate;

  while (current <= endDate) {
    dates.push(current);
    current = addDaysToDateString(current, 1);
  }

  return dates;
}

export function getDefaultFestivalDate(startDate: string, endDate: string, now = new Date()): string {
  const dates = getFestivalDates(startDate, endDate);
  if (dates.length === 0) {
    return startDate;
  }

  const today = getCurrentFestivalDayDate(now);

  if (dates.includes(today)) {
    return today;
  }

  const nearestUpcoming = dates.find((date) => date > today);
  if (nearestUpcoming) {
    return nearestUpcoming;
  }

  return dates[dates.length - 1];
}

export function getStageDotColor(stageId: StageId, stages?: Stage[]): string {
  return getStageColor(stageId, stages);
}

export function isSameFestivalDay(date: string, now = new Date()): boolean {
  return date === getCurrentFestivalDayDate(now);
}

export function getCurrentTimeMinutes(now = new Date()): number {
  const { hours, minutes } = getFestivalClockParts(now);
  return hours * 60 + minutes;
}

export { formatFestivalClock };

export function getPerformanceStartMinutes(performance: SchedulePerformance): number {
  const [hours, minutes] = performance.startTime.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatStartsIn(target: Date, now = new Date()): string {
  const diffMs = Math.max(target.getTime() - now.getTime(), 0);
  const totalMinutes = Math.ceil(diffMs / 60000);

  if (totalMinutes < 1) {
    return 'скоро';
  }
  if (totalMinutes < 60) {
    return `через ${totalMinutes} мин`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `через ${hours} ч`;
  }

  return `через ${hours} ч ${minutes} мин`;
}

function pluralRu(value: number, one: string, few: string, many: string): string {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return few;
  }
  return many;
}

export function formatSoonCountdown(target: Date, now = new Date()): string {
  const diffMs = Math.max(target.getTime() - now.getTime(), 0);

  if (diffMs < 60_000) {
    const seconds = Math.max(Math.ceil(diffMs / 1000), 1);
    return `через ${seconds} сек`;
  }

  if (diffMs < 3_600_000) {
    const minutes = Math.ceil(diffMs / 60_000);
    return `через ${minutes} мин`;
  }

  if (diffMs < 86_400_000) {
    const hours = Math.ceil(diffMs / 3_600_000);
    return `через ${hours} ${pluralRu(hours, 'час', 'часа', 'часов')}`;
  }

  const days = Math.ceil(diffMs / 86_400_000);
  return `через ${days} ${pluralRu(days, 'день', 'дня', 'дней')}`;
}

export function isPerformanceLive(performance: SchedulePerformance, now = new Date()): boolean {
  const start = parseDateTime(performance.date, performance.startTime);
  const end = getEndDateTime(performance.date, performance.startTime, performance.endTime);
  return getTimedStatus(start, end, now) === 'live';
}

export function isAutographLive(session: AutographSession, now = new Date()): boolean {
  const start = parseDateTime(session.date, session.startTime);
  const end = getEndDateTime(session.date, session.startTime, session.endTime);
  return getTimedStatus(start, end, now) === 'live';
}

export function getLivePerformances(
  performances: SchedulePerformance[],
  now = new Date(),
): SchedulePerformance[] {
  return sortByStartTime(performances.filter((performance) => isPerformanceLive(performance, now)));
}

export function getLiveAutographSessions(
  sessions: AutographSession[],
  now = new Date(),
): AutographSession[] {
  return sortByStartTime(sessions.filter((session) => isAutographLive(session, now)));
}

export function getNextPerformance(
  performances: SchedulePerformance[],
  now = new Date(),
  stageId?: StageId,
): SchedulePerformance | null {
  const filtered = stageId ? performances.filter((item) => item.stageId === stageId) : performances;

  return (
    sortByStartTime(filtered).find((item) => parseDateTime(item.date, item.startTime) > now) ?? null
  );
}

export function getNextPerformances(
  performances: SchedulePerformance[],
  now = new Date(),
  limit = 3,
  stageId?: StageId,
): SchedulePerformance[] {
  const filtered = stageId ? performances.filter((item) => item.stageId === stageId) : performances;

  return sortByStartTime(filtered)
    .filter((item) => parseDateTime(item.date, item.startTime) > now)
    .slice(0, limit);
}

export function getNextAutographSession(
  sessions: AutographSession[],
  now = new Date(),
  stageId?: StageId,
): AutographSession | null {
  const filtered = stageId ? sessions.filter((item) => item.stageId === stageId) : sessions;

  return (
    sortByStartTime(filtered).find((item) => parseDateTime(item.date, item.startTime) > now) ?? null
  );
}

export type PrimaryPerformance = {
  performance: SchedulePerformance;
  status: 'live' | 'upcoming';
};

export function getPrimaryPerformance(
  performances: SchedulePerformance[],
  now = new Date(),
  stageId?: StageId,
): PrimaryPerformance | null {
  const scoped = stageId ? performances.filter((item) => item.stageId === stageId) : performances;
  const live = getLivePerformances(scoped, now);

  if (live.length > 0) {
    return { performance: live[0], status: 'live' };
  }

  const next = getNextPerformance(scoped, now);
  if (next) {
    return { performance: next, status: 'upcoming' };
  }

  return null;
}

export type PrimaryAutograph = {
  session: AutographSession;
  status: 'live' | 'upcoming';
};

export function getPrimaryAutograph(
  sessions: AutographSession[],
  now = new Date(),
  stageId?: StageId,
): PrimaryAutograph | null {
  const scoped = stageId ? sessions.filter((item) => item.stageId === stageId) : sessions;
  const live = getLiveAutographSessions(scoped, now);

  if (live.length > 0) {
    return { session: live[0], status: 'live' };
  }

  const next = getNextAutographSession(scoped, now);
  if (next) {
    return { session: next, status: 'upcoming' };
  }

  return null;
}

export type PerformanceHighlight = 'live' | 'next' | 'past' | 'default';

export function getPerformanceHighlight(
  performance: SchedulePerformance,
  dayPerformances: SchedulePerformance[],
  now = new Date(),
): PerformanceHighlight {
  const end = getEndDateTime(performance.date, performance.startTime, performance.endTime);
  if (end <= now) {
    return 'past';
  }

  if (isPerformanceLive(performance, now)) {
    return 'live';
  }

  const primary = getPrimaryPerformance(dayPerformances, now, performance.stageId);
  if (
    primary?.status === 'upcoming' &&
    primary.performance.id === performance.id &&
    isStartingSoon(performance.date, performance.startTime, now)
  ) {
    return 'next';
  }

  return 'default';
}

export function getUpcomingOnSameStage(
  current: SchedulePerformance,
  performances: SchedulePerformance[],
): SchedulePerformance[] {
  const currentStart = parseDateTime(current.date, current.startTime).getTime();

  return performances
    .filter((item) => item.stageId === current.stageId)
    .filter((item) => parseDateTime(item.date, item.startTime).getTime() > currentStart)
    .sort((a, b) => parseDateTime(a.date, a.startTime).getTime() - parseDateTime(b.date, b.startTime).getTime())
    .slice(0, 5);
}

export function getStageName(stageId: StageId, stages: Stage[]): string {
  return stages.find((stage) => stage.id === stageId)?.name ?? stageId;
}

export function groupPerformancesByDate(
  performances: SchedulePerformance[],
): Record<string, SchedulePerformance[]> {
  return performances.reduce<Record<string, SchedulePerformance[]>>((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = [];
    }
    acc[item.date].push(item);
    return acc;
  }, {});
}

export function getCountdown(target: Date, now = new Date()) {
  const diff = Math.max(target.getTime() - now.getTime(), 0);
  const totalSeconds = Math.floor(diff / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isFinished: diff <= 0,
  };
}

export function isFestivalStarted(startDate: string, now = new Date()): boolean {
  return now >= parseDateTime(startDate, '12:00');
}

export function hasRemainingPerformances(
  performances: SchedulePerformance[],
  now = new Date(),
): boolean {
  return performances.some((performance) => {
    const end = getEndDateTime(performance.date, performance.startTime, performance.endTime);
    return now < end;
  });
}

export function isFestivalScheduleEnded(
  performances: SchedulePerformance[],
  now = new Date(),
): boolean {
  if (performances.length === 0) {
    return false;
  }

  return !hasRemainingPerformances(performances, now);
}

export function isFestivalEnded(endDate: string, now = new Date()): boolean {
  return now >= getFestivalDayWindow(endDate).end;
}

export function isFestivalOngoing(startDate: string, endDate: string, now = new Date()): boolean {
  return isFestivalStarted(startDate, now) && !isFestivalEnded(endDate, now);
}

export function isFestivalFinished(
  startDate: string,
  endDate: string,
  performances: SchedulePerformance[],
  now = new Date(),
): boolean {
  return (
    isFestivalEnded(endDate, now) ||
    (isFestivalStarted(startDate, now) && isFestivalScheduleEnded(performances, now))
  );
}

// Backward-compatible alias
export function getNextPerformanceOnStage(
  performances: SchedulePerformance[],
  stageId: StageId,
  now = new Date(),
): SchedulePerformance | null {
  return getNextPerformance(performances, now, stageId);
}
