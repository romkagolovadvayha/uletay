import { addDaysToDateString, formatFestivalClock, parseFestivalLocalDateTime } from './festivalTime';

/** Смещение от startDate: 1 = второй день фестиваля */
export const DEMO_FESTIVAL_DAY_OFFSET = 1;

/** «Середина» второго дня — вечерняя программа */
export const DEMO_FESTIVAL_CLOCK = '18:00';

export function buildDemoFestivalNow(festivalStartDate: string): Date {
  const demoDay = addDaysToDateString(festivalStartDate, DEMO_FESTIVAL_DAY_OFFSET);
  return parseFestivalLocalDateTime(demoDay, DEMO_FESTIVAL_CLOCK);
}

export function describeDemoFestivalMoment(festivalStartDate: string): string {
  const demoDay = addDaysToDateString(festivalStartDate, DEMO_FESTIVAL_DAY_OFFSET);
  const demoNow = buildDemoFestivalNow(festivalStartDate);
  const dayNumber = DEMO_FESTIVAL_DAY_OFFSET + 1;

  return `${dayNumber}-й день (${demoDay}), ${formatFestivalClock(demoNow)}`;
}
