/** Ижевск / Удмуртия — всегда UTC+4 (Europe/Samara) */
export const FESTIVAL_TIMEZONE = 'Europe/Samara';

const FESTIVAL_UTC_OFFSET = '+04:00';

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
