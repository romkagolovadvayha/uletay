import { AutographSession } from '../types';
import { FESTIVAL_TIMEZONE, parseFestivalDateOnly } from './festivalTime';
import {
  getEndDateTime,
  getPrimaryAutograph,
  isAutographLive,
  isStartingSoon,
  sortByStartTime,
} from './scheduleHelpers';

export type AutographHighlight = 'live' | 'next' | 'past' | 'default';

export function formatAutographDateParts(date: string): { dateLabel: string; weekday: string } {
  const parsed = parseFestivalDateOnly(date);
  const weekday = new Intl.DateTimeFormat('ru-RU', {
    timeZone: FESTIVAL_TIMEZONE,
    weekday: 'long',
  }).format(parsed);
  const [, month, day] = date.split('-');

  return {
    dateLabel: `${day}/${month}`,
    weekday,
  };
}

export function groupAutographsByDate(sessions: AutographSession[]): { date: string; items: AutographSession[] }[] {
  const grouped = sessions.reduce<Record<string, AutographSession[]>>((acc, session) => {
    if (!acc[session.date]) {
      acc[session.date] = [];
    }
    acc[session.date].push(session);
    return acc;
  }, {});

  return Object.keys(grouped)
    .sort()
    .map((date) => ({
      date,
      items: sortByStartTime(grouped[date]),
    }));
}

export function getAutographHighlight(
  session: AutographSession,
  daySessions: AutographSession[],
  now = new Date(),
): AutographHighlight {
  const end = getEndDateTime(session.date, session.startTime, session.endTime);
  if (end <= now) {
    return 'past';
  }

  if (isAutographLive(session, now)) {
    return 'live';
  }

  const primary = getPrimaryAutograph(daySessions, now, session.stageId);
  if (
    primary?.status === 'upcoming' &&
    primary.session.id === session.id &&
    isStartingSoon(session.date, session.startTime, now)
  ) {
    return 'next';
  }

  return 'default';
}
