/** Ижевск / Удмуртия — всегда UTC+4 (Europe/Samara) */
export const FESTIVAL_TIMEZONE = 'Europe/Samara';

/** Фестивальный день: с 04:00 до 03:59 следующего календарного дня */
export const FESTIVAL_DAY_START_HOUR = 4;

const FESTIVAL_UTC_OFFSET = '+04:00';

/** Календарная дата YYYY-MM-DD вкладки дня (день начинается в 04:00) */
export function getFestivalDayDate(calendarDate: string, startTime: string): string {
  const [hours] = startTime.split(':').map(Number);
  if (hours < FESTIVAL_DAY_START_HOUR) {
    return addDaysToDateString(calendarDate, -1);
  }
  return calendarDate;
}

/** Текущий фестивальный день по времени Удмуртии */
export function getCurrentFestivalDayDate(now = new Date()): string {
  const calendarDate = getFestivalDateString(now);
  const { hours } = getFestivalClockParts(now);
  if (hours < FESTIVAL_DAY_START_HOUR) {
    return addDaysToDateString(calendarDate, -1);
  }
  return calendarDate;
}

export function belongsToFestivalDay(calendarDate: string, startTime: string, festivalDay: string): boolean {
  return getFestivalDayDate(calendarDate, startTime) === festivalDay;
}

export function getFestivalDayWindow(festivalDay: string): { start: Date; end: Date } {
  return {
    start: parseFestivalLocalDateTime(festivalDay, `${String(FESTIVAL_DAY_START_HOUR).padStart(2, '0')}:00`),
    end: parseFestivalLocalDateTime(
      addDaysToDateString(festivalDay, 1),
      `${String(FESTIVAL_DAY_START_HOUR).padStart(2, '0')}:00`,
    ),
  };
}

/** Минуты от начала фестивального дня (04:00) или null, если событие не в этот день */
export function toFestivalDayTimelineMinutes(
  calendarDate: string,
  time: string,
  festivalDay: string,
): number | null {
  if (!belongsToFestivalDay(calendarDate, time, festivalDay)) {
    return null;
  }

  const at = parseFestivalLocalDateTime(calendarDate, time);
  const { start } = getFestivalDayWindow(festivalDay);
  return Math.floor((at.getTime() - start.getTime()) / 60_000);
}

export function formatFestivalDayTimelineLabel(timelineMinutes: number, festivalDay: string): string {
  const { start } = getFestivalDayWindow(festivalDay);
  const at = new Date(start.getTime() + timelineMinutes * 60_000);
  const { hours, minutes } = getFestivalClockParts(at);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function getNowFestivalDayTimelineMinutes(now: Date, festivalDay: string): number | null {
  if (getCurrentFestivalDayDate(now) !== festivalDay) {
    return null;
  }

  return toFestivalDayTimelineMinutes(getFestivalDateString(now), formatFestivalClock(now), festivalDay);
}

export function filterByFestivalDay<T extends { date: string; startTime: string }>(
  items: T[],
  festivalDay: string,
): T[] {
  return items.filter((item) => belongsToFestivalDay(item.date, item.startTime, festivalDay));
}

/** Локальное время фестиваля → момент в UTC (для сравнений и таймеров) */
export function parseFestivalLocalDateTime(date: string, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes ?? 0).padStart(2, '0');
  return new Date(`${date}T${hh}:${mm}:00${FESTIVAL_UTC_OFFSET}`);
}

/** Календарная дата фестиваля без сдвига из-за часового пояса устройства */
export function parseFestivalDateOnly(date: string): Date {
  return new Date(`${date}T12:00:00${FESTIVAL_UTC_OFFSET}`);
}

export function addDaysToDateString(date: string, days: number): string {
  const base = parseFestivalDateOnly(date);
  base.setUTCDate(base.getUTCDate() + days);
  const year = base.getUTCFullYear();
  const month = String(base.getUTCMonth() + 1).padStart(2, '0');
  const day = String(base.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Сегодняшняя дата YYYY-MM-DD по времени Удмуртии */
export function getFestivalDateString(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FESTIVAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function getFestivalClockParts(now = new Date()): { hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: FESTIVAL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  return {
    hours: Number(parts.find((part) => part.type === 'hour')?.value ?? 0),
    minutes: Number(parts.find((part) => part.type === 'minute')?.value ?? 0),
  };
}

export function formatFestivalClock(now = new Date()): string {
  const { hours, minutes } = getFestivalClockParts(now);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
