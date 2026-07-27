import { FestivalInfo } from '../types';
import {
  addDaysToDateString,
  formatFestivalClock,
  parseFestivalLocalDateTime,
} from './festivalTime';
import { getFestivalDates, isFestivalEnded } from './scheduleHelpers';

/** «Середина» дня — вечерняя программа */
export const DEMO_FESTIVAL_CLOCK = '18:00';

export type DemoFestivalWindow = {
  startDate: string;
  endDate: string;
  year: number;
  /** upcoming = текущее/следующее ещё не завершённое окно; previous = последнее прошедшее */
  source: 'upcoming' | 'previous';
};

function shiftDateYear(date: string, years: number): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${year + years}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Берёт следующее ещё не закончившееся окно фестиваля
 * (текущий год или сдвиг на +N лет). Если будущих нет — предыдущее из данных.
 */
export function resolveDemoFestivalWindow(
  festival: Pick<FestivalInfo, 'startDate' | 'endDate' | 'year'>,
  realNow = new Date(),
): DemoFestivalWindow {
  for (let offset = 0; offset <= 12; offset += 1) {
    const startDate = shiftDateYear(festival.startDate, offset);
    const endDate = shiftDateYear(festival.endDate, offset);
    if (!isFestivalEnded(endDate, realNow)) {
      return {
        startDate,
        endDate,
        year: Number(startDate.slice(0, 4)),
        source: 'upcoming',
      };
    }
  }

  return {
    startDate: festival.startDate,
    endDate: festival.endDate,
    year: festival.year,
    source: 'previous',
  };
}

/** Середина диапазона дней фестиваля, около 18:00 */
export function buildDemoFestivalNow(startDate: string, endDate: string): Date {
  const dates = getFestivalDates(startDate, endDate);
  const midDay = dates[Math.floor(dates.length / 2)] ?? startDate;
  return parseFestivalLocalDateTime(midDay, DEMO_FESTIVAL_CLOCK);
}

export function describeDemoFestivalMoment(startDate: string, endDate: string): string {
  const dates = getFestivalDates(startDate, endDate);
  const midIndex = Math.floor(dates.length / 2);
  const demoDay = dates[midIndex] ?? startDate;
  const demoNow = buildDemoFestivalNow(startDate, endDate);
  const dayNumber = midIndex + 1;

  return `${dayNumber}-й день (${demoDay}), ${formatFestivalClock(demoNow)}`;
}

export function daysBetweenDateStrings(from: string, to: string): number {
  const fromParts = from.split('-').map(Number);
  const toParts = to.split('-').map(Number);
  const fromUtc = Date.UTC(fromParts[0], fromParts[1] - 1, fromParts[2]);
  const toUtc = Date.UTC(toParts[0], toParts[1] - 1, toParts[2]);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

export function remapFestivalDate(
  date: string,
  fromStart: string,
  toStart: string,
  toEnd: string,
): string {
  const offset = daysBetweenDateStrings(fromStart, date);
  const mapped = addDaysToDateString(toStart, offset);
  if (mapped < toStart) {
    return toStart;
  }
  if (mapped > toEnd) {
    return toEnd;
  }
  return mapped;
}
