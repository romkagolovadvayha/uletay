import { SchedulePerformance, StageId } from '../types';
import { sortByStartTime } from './scheduleHelpers';

export const SCHEDULE_GRID_PIXELS_PER_MINUTE = 2.25;
export const SCHEDULE_GRID_MIN_CARD_HEIGHT = 52;
export const SCHEDULE_GRID_TIME_AXIS_WIDTH = 44;
export const SCHEDULE_GRID_COLUMN_GAP = 6;
export const SCHEDULE_GRID_HOUR_STEP = 60;

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes ?? 0);
}

export function formatMinutesAsClock(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function getPerformanceEndMinutes(performance: SchedulePerformance): number {
  const start = parseTimeToMinutes(performance.startTime);
  let end = parseTimeToMinutes(performance.endTime);
  if (end <= start) {
    end += 24 * 60;
  }
  return end;
}

export function getDayScheduleBounds(performances: SchedulePerformance[]): { start: number; end: number } {
  if (performances.length === 0) {
    return { start: 12 * 60, end: 24 * 60 };
  }

  let start = Number.POSITIVE_INFINITY;
  let end = 0;

  for (const performance of performances) {
    const performanceStart = parseTimeToMinutes(performance.startTime);
    const performanceEnd = getPerformanceEndMinutes(performance);
    start = Math.min(start, performanceStart);
    end = Math.max(end, performanceEnd);
  }

  const padding = 30;
  return {
    start: Math.max(0, Math.floor(start / SCHEDULE_GRID_HOUR_STEP) * SCHEDULE_GRID_HOUR_STEP - padding),
    end: Math.ceil(end / SCHEDULE_GRID_HOUR_STEP) * SCHEDULE_GRID_HOUR_STEP + padding,
  };
}

export function getHourMarkers(dayStart: number, dayEnd: number): number[] {
  const markers: number[] = [];
  const firstHour = Math.ceil(dayStart / SCHEDULE_GRID_HOUR_STEP) * SCHEDULE_GRID_HOUR_STEP;

  for (let minute = firstHour; minute <= dayEnd; minute += SCHEDULE_GRID_HOUR_STEP) {
    markers.push(minute);
  }

  return markers;
}

export function groupPerformancesByStage(
  performances: SchedulePerformance[],
): Partial<Record<StageId, SchedulePerformance[]>> {
  const grouped = performances.reduce<Partial<Record<StageId, SchedulePerformance[]>>>((acc, performance) => {
    if (!acc[performance.stageId]) {
      acc[performance.stageId] = [];
    }
    acc[performance.stageId]!.push(performance);
    return acc;
  }, {});

  for (const stageId of Object.keys(grouped) as StageId[]) {
    grouped[stageId] = sortByStartTime(grouped[stageId]!);
  }

  return grouped;
}

export type ScheduleGridCardLayout = {
  performance: SchedulePerformance;
  top: number;
  height: number;
};

export function layoutPerformanceCards(
  performances: SchedulePerformance[],
  dayStart: number,
): ScheduleGridCardLayout[] {
  return performances.map((performance) => {
    const start = parseTimeToMinutes(performance.startTime);
    const end = getPerformanceEndMinutes(performance);
    const duration = Math.max(end - start, 15);
    const height = Math.max(duration * SCHEDULE_GRID_PIXELS_PER_MINUTE, SCHEDULE_GRID_MIN_CARD_HEIGHT);

    return {
      performance,
      top: (start - dayStart) * SCHEDULE_GRID_PIXELS_PER_MINUTE,
      height,
    };
  });
}

export function minutesToGridOffset(minutes: number, dayStart: number): number {
  return (minutes - dayStart) * SCHEDULE_GRID_PIXELS_PER_MINUTE;
}
