import type { FestivalInfo } from '../types';

const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const;

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function parseIsoDate(value: string): DateParts | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
}

function formatDate(parts: DateParts, includeYear = true): string {
  const month = MONTHS_GENITIVE[parts.month - 1] ?? String(parts.month);
  return `${parts.day} ${month}${includeYear ? ` ${parts.year}` : ''}`;
}

export function formatFestivalDateRange(
  festival: Pick<FestivalInfo, 'startDate' | 'endDate'>,
): string {
  const start = parseIsoDate(festival.startDate);
  const end = parseIsoDate(festival.endDate);

  if (!start || !end) {
    return `${festival.startDate} — ${festival.endDate}`;
  }

  if (start.year === end.year && start.month === end.month) {
    const month = MONTHS_GENITIVE[end.month - 1] ?? String(end.month);
    return `${start.day}–${end.day} ${month} ${end.year}`;
  }

  if (start.year === end.year) {
    return `${formatDate(start, false)} — ${formatDate(end)}`;
  }

  return `${formatDate(start)} — ${formatDate(end)}`;
}

export function getFestivalDisplayName(
  festival: Pick<FestivalInfo, 'name' | 'year'>,
): string {
  return `${festival.name} ${festival.year}`;
}
