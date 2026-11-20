import type { AppData } from '../types';
import { addDaysToDateString, getCurrentFestivalDayDate, getFestivalDayDate, getFestivalDayWindow, parseFestivalLocalDateTime } from './festivalTime';

export function getArtistExpectationYear(data: Pick<AppData, 'festival' | 'schedule'>, now: Date): number {
  const { startDate, endDate, year } = data.festival;
  if (now >= getFestivalDayWindow(endDate).end) return year + 1;
  if (now < parseFestivalLocalDateTime(startDate, '12:00') || getCurrentFestivalDayDate(now) !== endDate) return year;
  const performances = data.schedule.filter(item => {
    const day = getFestivalDayDate(item.date, item.startTime);
    return day >= startDate && day <= endDate;
  });
  const ended = performances.length > 0 && performances.every(item => {
    const date = item.endTime <= item.startTime ? addDaysToDateString(item.date, 1) : item.date;
    return now >= parseFestivalLocalDateTime(date, item.endTime);
  });
  return year + (ended ? 1 : 0);
}
